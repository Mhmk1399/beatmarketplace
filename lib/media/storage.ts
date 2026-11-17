import { createWriteStream } from "node:fs";
import { mkdtemp, open, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ObjectStorageAsset } from "@/models/schemas/shared";
import { assetReference, byteLimit, copyStoredMaster, putMediaFile, removeStoredAssets, storedAssetStream } from "./adapter";
import { mediaDriver, s3Configuration } from "./config";
import { isSpooledFile, type MediaUpload } from "./types";
import { createWavPreviewFile } from "./wav-file";
import { MAX_MASTER_BYTES, MediaValidationError } from "./wav";

export { MediaValidationError } from "./wav";
export { mediaPath, partitionedMediaKey, removeStoredAssets } from "./adapter";
export { serveStoredAsset, parseMediaRange } from "./delivery";
export type { UploadedMediaFile } from "./types";

/** Bounded compatibility helper for tooling; HTTP delivery uses serveStoredAsset instead. */
export async function readStoredAsset(key: string, supplied?: ObjectStorageAsset) {
  const asset = supplied || { ...assetReference(key), storageKey: undefined };
  const source = await storedAssetStream(asset);
  const chunks: Buffer[] = [];
  let bytes = 0;
  const limiter = byteLimit(MAX_MASTER_BYTES + 44);
  const limited = source.pipe(limiter);
  source.once("error", (error: Error) => limiter.destroy(error));
  try {
    for await (const chunk of limited) { const data = Buffer.from(chunk); chunks.push(data); bytes += data.length; }
    return Buffer.concat(chunks, bytes);
  } finally { source.destroy(); }
}

async function materializeUpload(file: MediaUpload, target: string) {
  if (isSpooledFile(file)) return file.path;
  await pipeline(Readable.fromWeb(file.stream() as import("node:stream/web").ReadableStream<Uint8Array>),
    createWriteStream(/* turbopackIgnore: true */ target, { flags: "wx", mode: 0o600 }));
  return target;
}

export async function storeTrackMedia(input: { master?: MediaUpload; artwork?: MediaUpload; previewStartSeconds: number; existingMasterKey?: string; existingMaster?: ObjectStorageAsset }) {
  if (input.master && input.master.size > MAX_MASTER_BYTES) throw new MediaValidationError("WAV files must be at most 60 MB.", 413);
  if (input.artwork && input.artwork.size > 5 * 1024 * 1024) throw new MediaValidationError("Artwork must be at most 5 MB.", 413);
  if (mediaDriver() === "s3") s3Configuration();
  const directory = await mkdtemp(path.join(os.tmpdir(), "beat-process-"));
  const written: ObjectStorageAsset[] = [];
  try {
    let sourcePath: string;
    if (input.master) sourcePath = await materializeUpload(input.master, path.join(directory, "source.wav"));
    else {
      const existing = input.existingMaster || (input.existingMasterKey ? { ...assetReference(input.existingMasterKey), storageKey: undefined } : null);
      if (!existing) throw new MediaValidationError("A WAV master is required.");
      sourcePath = path.join(directory, "source.wav");
      await copyStoredMaster(existing, sourcePath);
    }
    const previewPath = path.join(directory, "preview.wav");
    const { durationSeconds } = await createWavPreviewFile(sourcePath, previewPath, input.previewStartSeconds);
    let artwork: { path: string; mimeType: string; extension: string } | undefined;
    if (input.artwork) {
      const imagePath = await materializeUpload(input.artwork, path.join(directory, "artwork"));
      const imageFile = await open(/* turbopackIgnore: true */ imagePath, "r");
      const header = Buffer.alloc(24);
      let read = 0;
      try { read = (await imageFile.read(header, 0, 24, 0)).bytesRead; } finally { await imageFile.close(); }
      if (read >= 24 && header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) artwork = { path: imagePath, extension: "png", mimeType: "image/png" };
      else if (read >= 4 && header[0] === 255 && header[1] === 216 && header[2] === 255) artwork = { path: imagePath, extension: "jpg", mimeType: "image/jpeg" };
      else if (read >= 16 && header.toString("ascii", 0, 4) === "RIFF" && header.toString("ascii", 8, 12) === "WEBP") artwork = { path: imagePath, extension: "webp", mimeType: "image/webp" };
      else throw new MediaValidationError("Artwork must be a PNG, JPEG, or WebP image.");
    }
    const preview = await putMediaFile(previewPath, "preview.wav", "preview.wav", "audio/wav", 30);
    written.push(preview);
    const result: { master?: ObjectStorageAsset; preview: ObjectStorageAsset; artwork?: ObjectStorageAsset; durationSeconds: number } = { preview, durationSeconds };
    if (input.master) { result.master = await putMediaFile(sourcePath, "master.wav", input.master.name, "audio/wav", durationSeconds); written.push(result.master); }
    if (artwork && input.artwork) { result.artwork = await putMediaFile(artwork.path, `artwork.${artwork.extension}`, input.artwork.name, artwork.mimeType); written.push(result.artwork); }
    return result;
  } catch (error) { await removeStoredAssets(written).catch(() => undefined); throw error; }
  finally {
    const absolute = path.resolve(directory);
    if (path.dirname(absolute) === path.resolve(os.tmpdir()) && path.basename(absolute).startsWith("beat-process-")) await rm(absolute, { recursive: true, force: true });
  }
}
