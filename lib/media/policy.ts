import type { ObjectStorageAsset } from "@/models/schemas/shared";

/** Derive application URLs from a known asset role, never a database-supplied external URL. */
export function previewUrl(asset?: ObjectStorageAsset) {
  return asset && /^[0-9a-f-]{36}\.preview\.(mp3|wav)$/.test(asset.key) &&
    asset.durationSeconds === 30 && ["audio/mpeg", "audio/wav"].includes(asset.mimeType)
    ? `/api/media/${asset.key}` : null;
}

export function artworkUrl(asset?: ObjectStorageAsset) {
  return asset && /^[0-9a-f-]{36}\.artwork\.(png|jpg|webp)$/.test(asset.key)
    ? `/api/media/${asset.key}` : null;
}
