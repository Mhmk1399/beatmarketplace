import type { ObjectStorageAsset } from "@/models/schemas/shared";
export type ProducerAssetRole = "Master WAV" | "Public preview" | "Artwork";
/** Metadata-only DTO. Storage locations and URLs are deliberately omitted. */
export function producerAssetDto(trackId: string, trackTitle: string, role: ProducerAssetRole, asset: ObjectStorageAsset) {
  return { id: `${trackId}:${role}`, trackId, trackTitle, role, originalFileName: asset.originalFileName, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes, uploadedAt: asset.uploadedAt.toISOString() };
}
