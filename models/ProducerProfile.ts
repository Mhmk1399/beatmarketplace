import mongoose, { type HydratedDocument, type Model, Schema } from "mongoose";
import { objectStorageAssetSchema, type ObjectStorageAsset } from "./schemas/shared";
import type { BannerPosition, ProducerLayout, ProducerSocial } from "@/lib/producers/types";

export type ProducerProfileFields = {
  userId: mongoose.Types.ObjectId;
  stageName: string;
  bio: string;
  genreIds: mongoose.Types.ObjectId[];
  storefrontName: string;
  tagline: string;
  location: string;
  website: string;
  socialLinks: Partial<Record<ProducerSocial, string>>;
  banner?: ObjectStorageAsset;
  bannerPosition: BannerPosition;
  layout: ProducerLayout;
  featuredTrackIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
};

export type ProducerProfileDocument = HydratedDocument<ProducerProfileFields>;

const producerProfileSchema = new Schema<ProducerProfileFields>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    stageName: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    bio: { type: String, default: "", maxlength: 1_000 },
    genreIds: [{ type: Schema.Types.ObjectId, ref: "Genre" }],
    storefrontName: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    tagline: { type: String, default: "", trim: true, maxlength: 160 },
    location: { type: String, default: "", trim: true, maxlength: 120 },
    website: { type: String, default: "", trim: true, maxlength: 2048 },
    socialLinks: {
      instagram: { type: String, trim: true, maxlength: 2048 }, youtube: { type: String, trim: true, maxlength: 2048 },
      soundcloud: { type: String, trim: true, maxlength: 2048 }, spotify: { type: String, trim: true, maxlength: 2048 },
      tiktok: { type: String, trim: true, maxlength: 2048 }, twitter: { type: String, trim: true, maxlength: 2048 },
    },
    banner: { type: objectStorageAssetSchema, required: false },
    bannerPosition: { type: String, enum: ["top", "center", "bottom"], default: "center" },
    layout: { type: String, enum: ["IMMERSIVE", "COMPACT"], default: "IMMERSIVE" },
    featuredTrackIds: { type: [{ type: Schema.Types.ObjectId, ref: "Track" }], default: [], validate: (ids: mongoose.Types.ObjectId[]) => ids.length <= 6 && new Set(ids.map(String)).size === ids.length },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_document, returnedObject) => {
        const result = returnedObject as Record<string, unknown>;
        result.id = String(result._id);
        result.userId = String(result.userId);
        delete result._id;
        delete result.__v;
      },
    },
  },
);

producerProfileSchema.index({ genreIds: 1 });

// Next dev can retain the previous Mongoose model across a schema hot reload.
if (process.env.NODE_ENV === "development" && mongoose.models.ProducerProfile && !mongoose.models.ProducerProfile.schema.path("featuredTrackIds")) {
  mongoose.deleteModel("ProducerProfile");
}

const ProducerProfileModel =
  (mongoose.models.ProducerProfile as Model<ProducerProfileFields> | undefined) ??
  mongoose.model<ProducerProfileFields>("ProducerProfile", producerProfileSchema);

export default ProducerProfileModel;
