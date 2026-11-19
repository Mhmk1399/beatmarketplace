import busboy from "busboy";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { configuredUploadConcurrency } from "./config";
import { MAX_MASTER_BYTES, MediaValidationError } from "./wav";
import type { UploadedMediaFile } from "./types";

export const MAX_ARTWORK_BYTES = 5 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 70 * 1024 * 1024;
const MAX_DATA_BYTES = 32_000;

const processState = globalThis as typeof globalThis & { beatMediaUploadCount?: number };

/** Per-process backpressure, not a substitute for a distributed API rate limiter. */
export function acquireMediaUploadLease() {
  const count = processState.beatMediaUploadCount || 0;
  if (count >= configuredUploadConcurrency()) throw new MediaValidationError("The upload service is busy. Please try again shortly.", 429);
  processState.beatMediaUploadCount = count + 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    processState.beatMediaUploadCount = Math.max(0, (processState.beatMediaUploadCount || 1) - 1);
  };
}

export async function parseBoundedTrackForm(request: Request, options: { artworkOnly?: boolean; imageFields?: readonly ("thumbnail" | "banner")[] } = {}) {
  const imageFields = options.imageFields ?? (options.artworkOnly ? ["artwork"] : null);
  const imageOnly = imageFields !== null;
  const allowedFiles = new Set<string>(imageFields ?? ["master", "artwork"]);
  const requestLimit = imageOnly ? allowedFiles.size * MAX_ARTWORK_BYTES + MAX_DATA_BYTES + 8192 : MAX_UPLOAD_BYTES;
  if (request.signal.aborted) throw new MediaValidationError("The upload was cancelled.");
  const contentType = request.headers.get("content-type");
  if (!contentType?.startsWith("multipart/form-data")) throw new MediaValidationError("Use a multipart form with track data and files.", 415);
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > requestLimit) throw new MediaValidationError(imageOnly ? "Each image must be at most 5 MB." : "This upload exceeds the 70 MB request limit.", 413);
  if (!request.body) throw new MediaValidationError("The upload body is missing.");
  const directory = await mkdtemp(path.join(os.tmpdir(), "beat-upload-"));
  let cleaned = false;
  const cleanup = async () => {
    if (cleaned) return;
    const absolute = path.resolve(directory);
    if (path.dirname(absolute) !== path.resolve(os.tmpdir()) || !path.basename(absolute).startsWith("beat-upload-")) throw new Error("Unsafe temporary upload directory.");
    cleaned = true;
    await rm(absolute, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  };
  const files: Partial<Record<"master" | "artwork" | "thumbnail" | "banner", UploadedMediaFile>> = {};
  const writes: Promise<void>[] = [];
  let rawData: string | undefined;
  let totalBytes = 0;
  let failure: Error | undefined;
  const controller = new AbortController();
  const fail = (error: Error) => {
    if (failure) return;
    failure = error;
    // Do not destroy multipart/Web streams reentrantly from Busboy's write callback.
    // Deferring cancellation also avoids native stream callback corruption on Node 26.
    setImmediate(() => controller.abort(error));
  };
  const onAbort = () => fail(new MediaValidationError("The upload was cancelled.", 400));
  request.signal.addEventListener("abort", onAbort, { once: true });
  const timeout = setTimeout(() => fail(new MediaValidationError("The upload took too long. Please try again.", 408)), 120_000);
  try {
    const parser = busboy({ headers: { "content-type": contentType },
      highWaterMark: 64 * 1024, fileHwm: 64 * 1024,
      limits: { fileSize: (imageOnly ? MAX_ARTWORK_BYTES : MAX_MASTER_BYTES) + 1, files: allowedFiles.size, fields: 1, fieldSize: MAX_DATA_BYTES + 1, parts: allowedFiles.size + 2, headerPairs: 100 },
    });
    parser.on("file", (name, stream, info) => {
      if (!allowedFiles.has(name)) { stream.resume(); fail(new MediaValidationError("An unexpected file field was uploaded.")); return; }
      const field = name as keyof typeof files;
      if (files[field]) { stream.resume(); fail(new MediaValidationError("Upload only one file for each image or audio field.")); return; }
      const descriptor: UploadedMediaFile = { name: path.basename(info.filename || "upload").slice(0, 255), path: path.join(directory, randomUUID()), size: 0, type: info.mimeType };
      files[field] = descriptor;
      const limit = name === "master" ? MAX_MASTER_BYTES : MAX_ARTWORK_BYTES;
      const meter = new Transform({ transform(chunk: Buffer, _encoding, callback) {
        descriptor.size += chunk.length;
        callback(descriptor.size > limit ? new MediaValidationError(`${name === "master" ? "WAV masters" : "Artwork"} must be at most ${name === "master" ? 60 : 5} MB.`, 413) : null, chunk);
      } });
      stream.on("limit", () => fail(new MediaValidationError("This file exceeds the upload limit.", 413)));
      const writing = pipeline(stream, meter, createWriteStream(descriptor.path, { flags: "wx", mode: 0o600 }), { signal: controller.signal })
        .catch((error: unknown) => { fail(error instanceof Error ? error : new MediaValidationError("The upload failed.")); });
      writes.push(writing);
    });
    parser.on("field", (name, value, info) => {
      if (name !== "data" || rawData !== undefined || info.nameTruncated || info.valueTruncated || Buffer.byteLength(value, "utf8") > MAX_DATA_BYTES) {
        fail(new MediaValidationError("A single track data field of at most 32 KB is required.")); return;
      }
      rawData = value;
    });
    parser.on("filesLimit", () => fail(new MediaValidationError("Too many files were uploaded.")));
    parser.on("fieldsLimit", () => fail(new MediaValidationError("Only the track data field is allowed.")));
    parser.on("partsLimit", () => fail(new MediaValidationError("Unexpected multipart content.")));
    const bodyLimit = new Transform({ transform(chunk: Buffer, _encoding, callback) {
      totalBytes += chunk.length;
      callback(totalBytes > requestLimit ? new MediaValidationError(imageOnly ? "Each image must be at most 5 MB." : "This upload exceeds the 70 MB request limit.", 413) : null, chunk);
    } });
    const source = Readable.fromWeb(request.body as import("node:stream/web").ReadableStream<Uint8Array>);
    await pipeline(source, bodyLimit, parser, { signal: controller.signal });
    await Promise.all(writes);
    if (failure) throw failure;
    if (!rawData) throw new MediaValidationError("Track data is required.");
    if (Object.values(files).some((file) => file.size === 0)) throw new MediaValidationError("Empty files cannot be uploaded.");
    let data: unknown;
    try { data = JSON.parse(rawData); } catch { throw new MediaValidationError("The track data must contain valid JSON."); }
    return { data, master: files.master, artwork: files.artwork, thumbnail: files.thumbnail, banner: files.banner, cleanup };
  } catch (error) {
    controller.abort();
    await Promise.allSettled(writes);
    await cleanup();
    if (failure) throw failure;
    if (error instanceof MediaValidationError) throw error;
    throw new MediaValidationError("The upload is incomplete or malformed. Please try again.");
  } finally {
    clearTimeout(timeout);
    request.signal.removeEventListener("abort", onAbort);
  }
}
