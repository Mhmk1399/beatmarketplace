import mongoose, { type HydratedDocument, type Model, Schema } from "mongoose";

import { transformMongoDocument } from "@/models/schemas/shared";

export type MoodFields = {
  name: string;
  slug: string;
  description: string;
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
    color: { type: String, default: null, match: /^#[0-9a-f]{6}$/i },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, toJSON: { transform: transformMongoDocument } },
);

const MoodModel = (mongoose.models.Mood as Model<MoodFields> | undefined) ?? mongoose.model<MoodFields>("Mood", moodSchema);

export default MoodModel;
