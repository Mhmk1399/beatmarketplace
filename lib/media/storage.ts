import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ObjectStorageAsset } from "@/models/schemas/shared";
import { assetReference, byteLimit, copyStoredMaster, putMediaFile, removeStoredAssets, storedAssetStream } from "./adapter";
import { mediaDriver, s3Configuration } from "./config";
import { isSpooledFile, type MediaUpload } from "./types";
import { prepareStoredImage } from "./images";
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
    let artwork: Awaited<ReturnType<typeof prepareStoredImage>> | undefined;
    if (input.artwork) {
      const imagePath = await materializeUpload(input.artwork, path.join(directory, "artwork"));
      artwork = await prepareStoredImage({ path: imagePath, name: input.artwork.name, size: input.artwork.size, type: input.artwork.type }, "artwork");
    }
    const preview = await putMediaFile(previewPath, "preview.wav", "preview.wav", "audio/wav", 30);
    written.push(preview);
    const result: { master?: ObjectStorageAsset; preview: ObjectStorageAsset; artwork?: ObjectStorageAsset; durationSeconds: number } = { preview, durationSeconds };
    if (input.master) { result.master = await putMediaFile(sourcePath, "master.wav", input.master.name, "audio/wav", durationSeconds); written.push(result.master); }
    if (artwork && input.artwork) { result.artwork = await putMediaFile(artwork.path, "artwork.webp", `${path.parse(input.artwork.name).name}.webp`, "image/webp"); result.artwork.width = artwork.width; result.artwork.height = artwork.height; written.push(result.artwork); }
    return result;
  } catch (error) { await removeStoredAssets(written).catch(() => undefined); throw error; }
  finally {
    const absolute = path.resolve(directory);
    if (path.dirname(absolute) === path.resolve(os.tmpdir()) && path.basename(absolute).startsWith("beat-process-")) await rm(absolute, { recursive: true, force: true });
  }
}
