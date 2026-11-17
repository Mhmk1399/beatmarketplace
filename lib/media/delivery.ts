import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ObjectStorageAsset } from "@/models/schemas/shared";
import { isLocalAsset, mediaS3Client, objectKey, resolveLocalPath, validateMediaKey } from "./adapter";
import { MediaValidationError } from "./wav";

/** One RFC 7233 byte range; multi-range responses are deliberately not supported. */
export function parseMediaRange(header: string | null, size: number) {
  if (header === null) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(size) || size <= 0) throw new MediaValidationError("Invalid byte range.", 416);
  const first = match[1] ? Number(match[1]) : null;
  const last = match[2] ? Number(match[2]) : null;
  if ((first !== null && !Number.isSafeInteger(first)) || (last !== null && !Number.isSafeInteger(last))) throw new MediaValidationError("Invalid byte range.", 416);
  const start = first === null ? Math.max(0, size - (last || 0)) : first;
  const end = first !== null && last !== null ? Math.min(last, size - 1) : size - 1;
  if (start < 0 || start >= size || end < start) throw new MediaValidationError("Invalid byte range.", 416);
  return { start, end };
}

/** Publication/ownership/paid-entitlement authorization must happen before this helper. */
export async function serveStoredAsset(request: Request, asset: ObjectStorageAsset, options: { downloadName?: string } = {}) {
  validateMediaKey(asset.key);
  const headers = new Headers({ "Content-Type": asset.mimeType, "Accept-Ranges": "bytes", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
  if (options.downloadName) headers.set("Content-Disposition", `attachment; filename="track.wav"; filename*=UTF-8''${encodeURIComponent(options.downloadName)}.wav`);
  if (!isLocalAsset(asset)) {
    if (!["S3", "R2"].includes(asset.provider)) throw new MediaValidationError("Unsupported media storage provider.", 503);
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
