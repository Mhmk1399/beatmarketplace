import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ObjectStorageAsset } from "@/models/schemas/shared";
import { storedAssetStream } from "./adapter";
import { encodePreview, MAX_PREVIEW_BYTES } from "./preview";
import { parseMediaRange } from "./range";
import { MediaValidationError } from "./wav";

type Entry = { bytes: Buffer; etag: string };
const MAX_CACHE_BYTES = 32 * 1024 * 1024;
const globalCache = globalThis as typeof globalThis & { beatPreviewCache?: {
  items: Map<string, Entry>; pending: Map<string, Promise<Entry>>; size: number;
} };
const cache = globalCache.beatPreviewCache ??= { items: new Map(), pending: new Map(), size: 0 };
function key(asset: ObjectStorageAsset, low: boolean) { return JSON.stringify([asset.provider, asset.bucket, asset.storageKey || asset.key, low]); }

function insert(id: string, bytes: Buffer) {
  const previous = cache.items.get(id);
  if (previous) { cache.size -= previous.bytes.length; cache.items.delete(id); }
  while (cache.size + bytes.length > MAX_CACHE_BYTES || cache.items.size >= 128) {
    const first = cache.items.entries().next().value;
    if (!first) break;
    cache.items.delete(first[0]); cache.size -= first[1].bytes.length;
  }
  const entry = { bytes, etag: `"${createHash("sha256").update(bytes).digest("hex")}"` };
  cache.items.set(id, entry); cache.size += bytes.length;
  return entry;
}

/** Upload preparation can warm this cache; masters and artwork are never admitted. */
export function seedPreviewCache(asset: ObjectStorageAsset, bytes: Buffer) {
  if (asset.key.endsWith(".preview.mp3") && asset.mimeType === "audio/mpeg" && bytes.length === asset.sizeBytes && bytes.length <= MAX_PREVIEW_BYTES) insert(key(asset, false), bytes);
}

async function getPreview(asset: ObjectStorageAsset, low: boolean): Promise<Entry> {
  if (!asset.key.endsWith(".preview.mp3") || asset.mimeType !== "audio/mpeg" || asset.sizeBytes > MAX_PREVIEW_BYTES) throw new MediaValidationError("Invalid preview.", 404);
  const id = key(asset, low), hit = cache.items.get(id);
  if (hit) { cache.items.delete(id); cache.items.set(id, hit); return hit; }
  const pending = cache.pending.get(id);
  if (pending) return pending;
  if (cache.pending.size >= 8) throw new MediaValidationError("Audio is busy. Please try again shortly.", 429);
  const loading = (async () => {
    if (low) {
      // A lower-data copy is derived ONLY from the independent cropped preview.
      const source = await getPreview(asset, false);
      const directory = await mkdtemp(path.join(os.tmpdir(), "beat-low-preview-"));
      try {
        const input = path.join(directory, "preview.mp3"), output = path.join(directory, "low.mp3");
        await writeFile(input, source.bytes, { mode: 0o600 });
        await encodePreview(input, output, { bitrate: 96, format: "mp3" });
        return insert(id, await readFile(output));
      } finally { await rm(directory, { recursive: true, force: true }); }
    }
    const stream = await storedAssetStream(asset, AbortSignal.timeout(15_000));
    const chunks: Buffer[] = []; let size = 0;
    try {
      for await (const chunk of stream) {
        const bytes = Buffer.from(chunk); size += bytes.length;
        if (size > MAX_PREVIEW_BYTES || size > asset.sizeBytes) throw new MediaValidationError("Invalid preview size.", 503);
        chunks.push(bytes);
      }
      if (size !== asset.sizeBytes) throw new MediaValidationError("Incomplete preview.", 503);
      return insert(id, Buffer.concat(chunks, size));
    } finally { stream.destroy(); }
  })();
  cache.pending.set(id, loading);
  try { return await loading; } finally { cache.pending.delete(id); }
}

/** Authorization is always resolved by the media route BEFORE cache access or a 304. */
export async function servePreview(request: Request, asset: ObjectStorageAsset) {
  const quality = new URL(request.url).searchParams.get("quality");
  if (quality && quality !== "low" && quality !== "standard") throw new MediaValidationError("Unknown audio quality.");
  const low = quality === "low", hit = cache.items.has(key(asset, low));
  const { bytes, etag } = await getPreview(asset, low);
  const headers = new Headers({
    "Content-Type": "audio/mpeg", "Accept-Ranges": "bytes", "ETag": etag,
    "Cache-Control": "private, no-cache", "Vary": "Cookie, Authorization",
    "Cross-Origin-Resource-Policy": "same-origin", "X-Content-Type-Options": "nosniff",
    "X-Preview-Cache": hit ? "HIT" : "MISS", "X-Audio-Quality": low ? "96" : "128",
  });
  const matches = request.headers.get("if-none-match")?.split(",").map(value => value.trim().replace(/^W\//, ""));
  if (matches?.includes(etag) || matches?.includes("*")) return new Response(null, { status: 304, headers });
  let range: { start: number; end: number } | null;
  try {
    const ifRange = request.headers.get("if-range");
    range = parseMediaRange(ifRange && ifRange !== etag ? null : request.headers.get("range"), bytes.length);
  } catch { headers.set("Content-Range", `bytes */${bytes.length}`); return new Response(null, { status: 416, headers }); }
  const body = range ? bytes.subarray(range.start, range.end + 1) : bytes;
  headers.set("Content-Length", String(body.length));
  if (range) headers.set("Content-Range", `bytes ${range.start}-${range.end}/${bytes.length}`);
  return new Response(request.method === "HEAD" ? null : new Uint8Array(body), { status: range ? 206 : 200, headers });
}
