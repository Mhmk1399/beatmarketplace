import mongoose, { type HydratedDocument, type Model, Schema } from "mongoose";

import { objectStorageAssetSchema, type ObjectStorageAsset, transformMongoDocument } from "@/models/schemas/shared";

export type MoodFields = {
  name: string;
  slug: string;
  description: string;
  thumbnail?: ObjectStorageAsset;
  banner?: ObjectStorageAsset;
  color: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type MoodDocument = HydratedDocument<MoodFields>;

const moodSchema = new Schema<MoodFields>(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 100 },
    description: { type: String, default: "", maxlength: 1_000 },
    thumbnail: { type: objectStorageAssetSchema, required: false },
    banner: { type: objectStorageAssetSchema, required: false },
    color: { type: String, default: null, match: /^#[0-9a-f]{6}$/i },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, toJSON: { transform: transformMongoDocument } },
);

moodSchema.index({ isActive: 1, sortOrder: 1, name: 1, _id: 1 });
moodSchema.index({ createdAt: -1, _id: -1 });

const MoodModel = (mongoose.models.Mood as Model<MoodFields> | undefined) ?? mongoose.model<MoodFields>("Mood", moodSchema);
if (process.env.NODE_ENV !== "production" && !MoodModel.schema.path("thumbnail")) {
  MoodModel.schema.add({ thumbnail: { type: objectStorageAssetSchema }, banner: { type: objectStorageAssetSchema } });
}

export default MoodModel;
