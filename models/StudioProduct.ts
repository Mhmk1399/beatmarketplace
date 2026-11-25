import mongoose, { type Model, Schema } from "mongoose";
import {
  objectStorageAssetSchema,
  transformMongoDocument,
  type ObjectStorageAsset,
} from "@/models/schemas/shared";
export type StudioProductKind = "TRACKLIST" | "SOUND_KIT" | "SERVICE" | "VIDEO";
export type StudioProductFields = {
  producerId: mongoose.Types.ObjectId;
  kind: StudioProductKind;
  title: string;
  description: string;
  status: "DRAFT" | "PUBLISHED";
  trackIds: mongoose.Types.ObjectId[];
  videoUrl: string;
  videoProvider: "" | "YOUTUBE" | "VIMEO";
  priceToman: number | null;
  assetName: string;
  assetMimeType: string;
  assetSizeBytes: number | null;
  encryptedAsset?: ObjectStorageAsset;
  assetVersion: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};
const schema = new Schema<StudioProductFields>(
  {
    producerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ["TRACKLIST", "SOUND_KIT", "SERVICE", "VIDEO"],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: "", maxlength: 8000 },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED"],
      default: "DRAFT",
      index: true,
    },
    trackIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Track" }],
      default: [],
    },
    videoUrl: { type: String, default: "", maxlength: 2048 },
    videoProvider: {
      type: String,
      enum: ["", "YOUTUBE", "VIMEO"],
      default: "",
    },
    priceToman: { type: Number, default: null, min: 1000, max: 1_000_000_000 },
    assetName: { type: String, default: "", maxlength: 255 },
    assetMimeType: { type: String, default: "", maxlength: 120 },
    assetSizeBytes: { type: Number, default: null, min: 0 },
    encryptedAsset: {
      type: objectStorageAssetSchema,
      required: false,
      select: false,
    },
    assetVersion: { type: Number, default: 0, min: 0 },
    version: { type: Number, default: 1, min: 1 },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
    toJSON: { transform: transformMongoDocument },
  },
);
schema.index({ producerId: 1, kind: 1, createdAt: -1, _id: -1 });
schema.index({ kind: 1, status: 1, createdAt: -1 });
const StudioProductModel =
  (mongoose.models.StudioProduct as Model<StudioProductFields> | undefined) ??
  mongoose.model<StudioProductFields>("StudioProduct", schema);
export default StudioProductModel;
