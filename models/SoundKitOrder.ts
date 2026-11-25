import mongoose, { type Model, Schema } from "mongoose";
import {
  objectStorageAssetSchema,
  type ObjectStorageAsset,
} from "@/models/schemas/shared";
export type SoundKitOrderFields = {
  buyerId: mongoose.Types.ObjectId;
  producerId: mongoose.Types.ObjectId;
  kitId: mongoose.Types.ObjectId;
  idempotencyKey: string;
  title: string;
  price: number;
  currency: "IRT";
  productVersion: number;
  assetVersion: number;
  assetName: string;
  assetSizeBytes: number;
  encryptedAsset: ObjectStorageAsset;
  status: "PENDING" | "PAID" | "CANCELLED";
  authority?: string;
  referenceId?: string;
  gatewayMode: "sandbox" | "live";
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};
const schema = new Schema<SoundKitOrderFields>(
  {
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    producerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    kitId: {
      type: Schema.Types.ObjectId,
      ref: "StudioProduct",
      required: true,
    },
    idempotencyKey: { type: String, required: true },
    title: { type: String, required: true, maxlength: 160 },
    price: { type: Number, required: true, min: 1000 },
    currency: { type: String, enum: ["IRT"], default: "IRT" },
    productVersion: { type: Number, required: true, min: 1 },
    assetVersion: { type: Number, required: true, min: 1 },
    assetName: { type: String, required: true, maxlength: 255 },
    assetSizeBytes: { type: Number, required: true, min: 1 },
    encryptedAsset: {
      type: objectStorageAssetSchema,
      required: true,
      select: false,
    },
    status: {
      type: String,
      enum: ["PENDING", "PAID", "CANCELLED"],
      default: "PENDING",
    },
    authority: { type: String, unique: true, sparse: true },
    referenceId: String,
    gatewayMode: { type: String, enum: ["sandbox", "live"], required: true },
    paidAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, value) {
        delete (value as { encryptedAsset?: unknown }).encryptedAsset;
      },
    },
  },
);
schema.index({ buyerId: 1, idempotencyKey: 1 }, { unique: true });
schema.index({ buyerId: 1, createdAt: -1 });
const SoundKitOrderModel =
  (mongoose.models.SoundKitOrder as Model<SoundKitOrderFields> | undefined) ??
  mongoose.model<SoundKitOrderFields>("SoundKitOrder", schema);
export default SoundKitOrderModel;
