import mongoose, { type HydratedDocument, type Model, Schema } from "mongoose";

import { objectStorageAssetSchema, type ObjectStorageAsset, transformMongoDocument } from "@/models/schemas/shared";

export type InstrumentFamily =
  | "DRUMS"
  | "PERCUSSION"
  | "KEYS"
  | "STRINGS"
  | "WOODWIND"
  | "BRASS"
  | "GUITAR"
  | "BASS"
  | "SYNTH"
  | "VOCAL"
  | "FX"
  | "OTHER";

export type InstrumentFields = {
  name: string;
  slug: string;
  family: InstrumentFamily;
  description: string;
  thumbnail?: ObjectStorageAsset;
  banner?: ObjectStorageAsset;
  aliases: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type InstrumentDocument = HydratedDocument<InstrumentFields>;

const instrumentSchema = new Schema<InstrumentFields>(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    family: {
      type: String,
      enum: ["DRUMS", "PERCUSSION", "KEYS", "STRINGS", "WOODWIND", "BRASS", "GUITAR", "BASS", "SYNTH", "VOCAL", "FX", "OTHER"],
      required: true,
      index: true,
    },
    description: { type: String, default: "", maxlength: 1_000 },
    thumbnail: { type: objectStorageAssetSchema, required: false },
    banner: { type: objectStorageAssetSchema, required: false },
    aliases: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, toJSON: { transform: transformMongoDocument } },
);

instrumentSchema.index({ family: 1, sortOrder: 1, name: 1 });
instrumentSchema.index({ isActive: 1, sortOrder: 1, name: 1, _id: 1 });
instrumentSchema.index({ createdAt: -1, _id: -1 });

const InstrumentModel =
  (mongoose.models.Instrument as Model<InstrumentFields> | undefined) ??
  mongoose.model<InstrumentFields>("Instrument", instrumentSchema);

if (process.env.NODE_ENV !== "production" && !InstrumentModel.schema.path("thumbnail")) {
  InstrumentModel.schema.add({ thumbnail: { type: objectStorageAssetSchema }, banner: { type: objectStorageAssetSchema } });
}

export default InstrumentModel;
