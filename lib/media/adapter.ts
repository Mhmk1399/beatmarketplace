import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { DeleteObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import type { ObjectStorageAsset } from "@/models/schemas/shared";
import { localMediaRoot, mediaDriver, s3Configuration } from "./config";
import { MAX_MASTER_BYTES, MediaValidationError } from "./wav";

export const mediaKeyPattern = /^[0-9a-f-]{36}\.(master\.wav|preview\.wav|artwork\.(png|jpg|webp))$/;
export function validateMediaKey(key: string) { if (!mediaKeyPattern.test(key)) throw new MediaValidationError("Invalid media key.", 404); }
export function partitionedMediaKey(key: string) { validateMediaKey(key); return `${key.slice(0, 2)}/${key.slice(2, 4)}/${key}`; }
export function mediaPath(key: string, storedKey?: string) {
  validateMediaKey(key);
  if (storedKey && storedKey !== key && storedKey !== partitionedMediaKey(key)) throw new MediaValidationError("Invalid local media location.", 404);
  return path.join(/* turbopackIgnore: true */ localMediaRoot(), storedKey || key);
}
export function isLocalAsset(asset: ObjectStorageAsset) { return asset.provider === "OTHER" && asset.bucket === "local-private"; }
export function objectKey(asset: ObjectStorageAsset) { return asset.storageKey || asset.key; }

let cached: { signature: string; client: S3Client } | undefined;
export function mediaS3Client() {
  const config = s3Configuration();
  const signature = JSON.stringify([config.region, config.endpoint, config.forcePathStyle, config.accessKeyId, config.secretAccessKey]);
  if (!cached || cached.signature !== signature) {
    cached?.client.destroy();
    cached = { signature, client: new S3Client({ region: config.region, endpoint: config.endpoint, forcePathStyle: config.forcePathStyle,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      requestHandler: { connectionTimeout: 5000, requestTimeout: 30_000 },
      requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED", maxAttempts: 3 }) };
  }
  return cached.client;
}

export function assetReference(key: string): ObjectStorageAsset {
  validateMediaKey(key);
  const config = mediaDriver() === "s3" ? s3Configuration() : null;
  return { key, provider: config?.provider || "OTHER", bucket: config?.bucket || "local-private",
    storageKey: config ? `${config.prefix}/${partitionedMediaKey(key)}` : partitionedMediaKey(key),
    originalFileName: "media", mimeType: "application/octet-stream", sizeBytes: 0, uploadedAt: new Date() };
}

export async function resolveLocalPath(asset: ObjectStorageAsset) {
  const target = mediaPath(asset.key, asset.storageKey);
  if (asset.storageKey) return target;
  try { await stat(/* turbopackIgnore: true */ target); return target; } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
    return mediaPath(asset.key, partitionedMediaKey(asset.key));
  }
}

export async function storedAssetStream(asset: ObjectStorageAsset) {
  validateMediaKey(asset.key);
  if (isLocalAsset(asset)) return createReadStream(/* turbopackIgnore: true */ await resolveLocalPath(asset));
  if (!["S3", "R2"].includes(asset.provider)) throw new MediaValidationError("Unsupported media storage provider.", 503);
  const result = await mediaS3Client().send(new GetObjectCommand({ Bucket: asset.bucket, Key: objectKey(asset) }));
  if (!result.Body) throw new MediaValidationError("Media could not be found.", 404);
  return result.Body as Readable;
}

export function byteLimit(max: number) {
  let total = 0;
  return new Transform({ transform(chunk: Buffer, _encoding, callback) {
    total += chunk.length;
    callback(total > max ? new MediaValidationError("Stored file exceeds the supported size.", 413) : null, chunk);
  } });
}

export async function copyStoredMaster(asset: ObjectStorageAsset, target: string) {
  await pipeline(await storedAssetStream(asset), byteLimit(MAX_MASTER_BYTES), createWriteStream(/* turbopackIgnore: true */ target, { flags: "wx", mode: 0o600 }));
}

export async function putMediaFile(filePath: string, suffix: string, name: string, mimeType: string, durationSeconds?: number) {
  const details = await stat(/* turbopackIgnore: true */ filePath);
  const key = `${randomUUID()}.${suffix}`;
  const asset: ObjectStorageAsset = { ...assetReference(key), originalFileName: name.slice(0, 255), mimeType, sizeBytes: details.size, durationSeconds,
    ...(suffix === "master.wav" ? {} : { publicUrl: `/api/media/${key}` }) };
  if (isLocalAsset(asset)) {
    const destination = mediaPath(key, asset.storageKey);
    await mkdir(/* turbopackIgnore: true */ path.dirname(destination), { recursive: true });
    try { await pipeline(createReadStream(/* turbopackIgnore: true */ filePath), createWriteStream(/* turbopackIgnore: true */ destination, { flags: "wx", mode: 0o600 })); }
    catch (error) { await unlink(/* turbopackIgnore: true */ destination).catch(() => undefined); throw error; }
  } else {
    const source = createReadStream(/* turbopackIgnore: true */ filePath);
    const upload = new Upload({ client: mediaS3Client(), params: { Bucket: asset.bucket, Key: objectKey(asset), Body: source,
      ContentType: mimeType, ContentLength: details.size, CacheControl: "private, no-store" }, queueSize: 2, partSize: 5 * 1024 * 1024, leavePartsOnError: false });
    try { await upload.done(); } finally { source.destroy(); }
  }
  return asset;
}

/** Prefer full references when removing files created under a previous storage backend. */
export async function removeStoredAssets(references: (string | ObjectStorageAsset)[]) {
  await Promise.all(references.filter(Boolean).map(async (reference) => {
    const asset = typeof reference === "string" ? assetReference(reference) : reference;
    validateMediaKey(asset.key);
    if (isLocalAsset(asset)) {
      await unlink(/* turbopackIgnore: true */ await resolveLocalPath(asset)).catch((error: unknown) => {
        if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
      });
    } else {
      if (!["S3", "R2"].includes(asset.provider)) throw new MediaValidationError("Unsupported media storage provider.", 503);
      await mediaS3Client().send(new DeleteObjectCommand({ Bucket: asset.bucket, Key: objectKey(asset) }));
    }
  }));
}
