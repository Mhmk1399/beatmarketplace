import mongoose, { type HydratedDocument, type Model, Schema } from "mongoose";

import { objectStorageAssetSchema, type ObjectStorageAsset, transformMongoDocument } from "@/models/schemas/shared";

export type GenreFields = {
  parentGenreId: mongoose.Types.ObjectId | null;
  name: string;
  slug: string;
  description: string;
  thumbnail?: ObjectStorageAsset;
  banner?: ObjectStorageAsset;
  aliases: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type GenreDocument = HydratedDocument<GenreFields>;

const genreSchema = new Schema<GenreFields>(
  {
    parentGenreId: { type: Schema.Types.ObjectId, ref: "Genre", default: null, index: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    description: { type: String, default: "", maxlength: 1_000 },
    thumbnail: { type: objectStorageAssetSchema, required: false },
    banner: { type: objectStorageAssetSchema, required: false },
    aliases: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, toJSON: { transform: transformMongoDocument } },
);

genreSchema.index({ parentGenreId: 1, sortOrder: 1, name: 1 });
genreSchema.index({ createdAt: -1, _id: -1 });
genreSchema.index({ isActive: 1, sortOrder: 1, name: 1, _id: 1 });

const GenreModel = (mongoose.models.Genre as Model<GenreFields> | undefined) ?? mongoose.model<GenreFields>("Genre", genreSchema);

// Extend a model retained by Next development reloads without dropping its data.
if (process.env.NODE_ENV !== "production" && !GenreModel.schema.path("thumbnail")) {
  GenreModel.schema.add({
    thumbnail: { type: objectStorageAssetSchema, required: false },
    banner: { type: objectStorageAssetSchema, required: false },
  });
}

export default GenreModel;
