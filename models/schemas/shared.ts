import { Schema } from "mongoose";

export type StorageProvider = "S3" | "R2" | "GCS" | "AZURE" | "OTHER";

export type ObjectStorageAsset = {
  provider: StorageProvider;
  bucket: string;
  key: string;
  publicUrl?: string;
  mimeType: string;
  originalFileName: string;
  sizeBytes: number;
  checksum?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  uploadedAt: Date;
};

export const objectStorageAssetSchema = new Schema<ObjectStorageAsset>(
  {
    provider: {
      type: String,
      enum: ["S3", "R2", "GCS", "AZURE", "OTHER"],
      required: true,
    },
    bucket: { type: String, required: true, trim: true, maxlength: 255 },
    key: { type: String, required: true, trim: true, maxlength: 1_024 },
    publicUrl: { type: String, trim: true, maxlength: 2_048 },
    mimeType: { type: String, required: true, trim: true, maxlength: 255 },
    originalFileName: { type: String, required: true, trim: true, maxlength: 255 },
    sizeBytes: { type: Number, required: true, min: 0 },
    checksum: { type: String, trim: true, maxlength: 255 },
    width: { type: Number, min: 1 },
    height: { type: Number, min: 1 },
    durationSeconds: { type: Number, min: 0 },
    uploadedAt: { type: Date, default: Date.now, required: true },
  },
  { _id: false },
);

export function transformMongoDocument(_document: unknown, returnedObject: unknown) {
  const result = returnedObject as Record<string, unknown>;
  result.id = String(result._id);
  delete result._id;
  delete result.__v;
}
