import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ObjectStorageAsset } from "@/models/schemas/shared";
import { byteLimit, isLocalAsset, mediaS3Client, objectKey, resolveLocalPath, validateMediaKey } from "./adapter";
import { s3DeliveryMode } from "./config";
import { MAX_MASTER_BYTES, MediaValidationError } from "./wav";
import { parseMediaRange } from "./range";
import { servePreview } from "./preview-cache";

export { parseMediaRange } from "./range";

/** Publication/ownership/paid-entitlement authorization must happen before this helper. */
export async function serveStoredAsset(request: Request, asset: ObjectStorageAsset, options: { downloadName?: string; privateDownload?: boolean } = {}) {
  validateMediaKey(asset.key);
  if (asset.key.endsWith(".master.wav") && !options.privateDownload) throw new MediaValidationError("Media could not be found.", 404);
  if (options.privateDownload && (!asset.key.endsWith(".master.wav") || asset.mimeType !== "audio/wav")) throw new MediaValidationError("Purchased file not found.", 404);
  if (!options.privateDownload && asset.key.endsWith(".preview.mp3") && asset.mimeType === "audio/mpeg") return servePreview(request, asset);
  const headers = new Headers({ "Content-Type": asset.mimeType, "Accept-Ranges": "bytes", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "same-origin", "Referrer-Policy": "no-referrer" });
  if (options.downloadName) headers.set("Content-Disposition", `attachment; filename="track.wav"; filename*=UTF-8''${encodeURIComponent(options.downloadName)}.wav`);
  if (!isLocalAsset(asset)) {
    if (!["S3", "R2"].includes(asset.provider)) throw new MediaValidationError("Unsupported media storage provider.", 503);
    // Purchased masters always pass through authorization; never disclose reusable bucket URLs.
    if ((options.privateDownload || s3DeliveryMode() === "proxy") && request.method !== "HEAD") {
      const client = mediaS3Client();
      const size = Number.isSafeInteger(asset.sizeBytes) && asset.sizeBytes > 0 ? asset.sizeBytes : (await client.send(new HeadObjectCommand({ Bucket: asset.bucket, Key: objectKey(asset) }), { abortSignal: request.signal })).ContentLength;
      if (!size || size > MAX_MASTER_BYTES + 44) throw new MediaValidationError("Stored file exceeds the supported size.", 413);
      let range: { start: number; end: number } | null;
      try { range = parseMediaRange(request.headers.get("range"), size); } catch {
        headers.set("Content-Range", `bytes */${size}`); return new Response(null, { status: 416, headers });
      }
      const expected = range ? range.end - range.start + 1 : size;
      const object = await client.send(new GetObjectCommand({ Bucket: asset.bucket, Key: objectKey(asset), ...(range ? { Range: `bytes=${range.start}-${range.end}` } : {}) }), { abortSignal: request.signal });
      const source = object.Body as Readable | undefined;
      if (!source) throw new MediaValidationError("Media could not be found.", 404);
      if (object.ContentLength !== undefined && object.ContentLength !== expected) { source.destroy(); throw new MediaValidationError("The stored media range is unavailable.", 503); }
      const limited = byteLimit(expected);
      const abort = () => limited.destroy();
      source.once("error", (error: Error) => limited.destroy(error));
      limited.once("close", () => { source.destroy(); request.signal.removeEventListener("abort", abort); });
      request.signal.addEventListener("abort", abort, { once: true });
      source.pipe(limited);
      if (request.signal.aborted) abort();
      headers.set("Content-Length", String(expected));
      if (range) headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
      // Explicit compatibility mode: stream with backpressure rather than buffering files.
      return new Response(Readable.toWeb(limited) as ReadableStream<Uint8Array>, { status: range ? 206 : 200, headers });
    }
    if (request.method === "HEAD") {
      const metadata = await mediaS3Client().send(new HeadObjectCommand({ Bucket: asset.bucket, Key: objectKey(asset) }));
      const size = metadata.ContentLength ?? asset.sizeBytes;
      let range: { start: number; end: number } | null;
      try { range = parseMediaRange(request.headers.get("range"), size); } catch {
        headers.set("Content-Range", `bytes */${size}`); return new Response(null, { status: 416, headers });
      }
      headers.set("Content-Length", String(range ? range.end - range.start + 1 : size));
      if (range) headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
      return new Response(null, { status: range ? 206 : 200, headers });
    }
    const url = await getSignedUrl(mediaS3Client(), new GetObjectCommand({ Bucket: asset.bucket, Key: objectKey(asset),
      ResponseContentType: asset.mimeType, ResponseCacheControl: "private, no-store",
      ...(options.downloadName ? { ResponseContentDisposition: headers.get("Content-Disposition")! } : {}) }), { expiresIn: 60 });
    // The client downloads directly from the private object store, bypassing app-server bandwidth.
    return new Response(null, { status: 307, headers: { Location: url, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
  }
  const location = await resolveLocalPath(asset);
  const details = await stat(/* turbopackIgnore: true */ location);
  let range: { start: number; end: number } | null;
  try { range = parseMediaRange(request.headers.get("range"), details.size); } catch (error) {
    if (error instanceof MediaValidationError && error.status === 416) { headers.set("Content-Range", `bytes */${details.size}`); return new Response(null, { status: 416, headers }); }
    throw error;
  }
  headers.set("Content-Length", String(range ? range.end - range.start + 1 : details.size));
  if (range) headers.set("Content-Range", `bytes ${range.start}-${range.end}/${details.size}`);
  if (request.method === "HEAD") return new Response(null, { status: range ? 206 : 200, headers });
  const source = createReadStream(/* turbopackIgnore: true */ location, { ...(range || {}), highWaterMark: 64 * 1024 });
  const abort = () => source.destroy();
  request.signal.addEventListener("abort", abort, { once: true });
  source.once("close", () => request.signal.removeEventListener("abort", abort));
  if (request.signal.aborted) source.destroy();
  return new Response(Readable.toWeb(source) as ReadableStream<Uint8Array>, { status: range ? 206 : 200, headers });
}
