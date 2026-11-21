import mongoose, { type HydratedDocument, type Model, Schema } from "mongoose";

import { objectStorageAssetSchema, type ObjectStorageAsset, transformMongoDocument } from "@/models/schemas/shared";
import { MUSICAL_KEYS, normalizeMusicalKey } from "@/lib/music/keys";
import { installTrackSearch } from "@/lib/search/track-index";

export type TrackStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
export type TrackVisibility = "PUBLIC" | "PRIVATE";
export type CollaboratorRole =
  | "CO_PRODUCER"
  | "ARTIST"
  | "SONGWRITER"
  | "COMPOSER"
  | "MIX_ENGINEER"
  | "MASTERING_ENGINEER"
  | "OTHER";
export type CollaborationStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export type TrackCollaborator = {
  userId: mongoose.Types.ObjectId;
  role: CollaboratorRole;
  creditName?: string;
  revenueSharePercentage: number;
  status: CollaborationStatus;
  invitedAt: Date;
  respondedAt?: Date;
};

export type TrackMetadata = {
  musicalKey: string;
  bpm: number;
  tags: string[];
  genreId: mongoose.Types.ObjectId | null;
  moodIds: mongoose.Types.ObjectId[];
  instrumentIds: mongoose.Types.ObjectId[];
  durationSeconds?: number;
  isExplicit: boolean;
};

export type TrackFields = {
  producerId: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  artwork?: ObjectStorageAsset;
  audio: {
    preview?: ObjectStorageAsset;
    master?: ObjectStorageAsset;
    stems: ObjectStorageAsset[];
    previewStartSeconds: number;
    previewDurationSeconds: number;
  };
  metadata: TrackMetadata;
  visibility: TrackVisibility;
  status: TrackStatus;
  releaseDate: Date | null;
  publishedAt: Date | null;
  collaborators: TrackCollaborator[];
  createdAt: Date;
  updatedAt: Date;
};

export type TrackDocument = HydratedDocument<TrackFields>;

const collaboratorSchema = new Schema<TrackCollaborator>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: ["CO_PRODUCER", "ARTIST", "SONGWRITER", "COMPOSER", "MIX_ENGINEER", "MASTERING_ENGINEER", "OTHER"],
      required: true,
    },
    creditName: { type: String, trim: true, maxlength: 120 },
    revenueSharePercentage: { type: Number, default: 0, min: 0, max: 100 },
    status: { type: String, enum: ["PENDING", "ACCEPTED", "DECLINED"], default: "PENDING" },
    invitedAt: { type: Date, default: Date.now, required: true },
    respondedAt: Date,
  },
  { _id: true },
);

const trackMetadataSchema = new Schema<TrackMetadata>(
  {
    musicalKey: { type: String, required: true, trim: true, enum: MUSICAL_KEYS, set: (value: string) => normalizeMusicalKey(value) ?? value },
    bpm: { type: Number, required: true, min: 20, max: 400 },
    tags: {
      type: [String],
      default: [],
      set: (tags: string[]) => [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 30),
    },
    genreId: { type: Schema.Types.ObjectId, ref: "Genre", default: null, index: true },
    moodIds: { type: [{ type: Schema.Types.ObjectId, ref: "Mood" }], default: [], validate: { validator: (ids: mongoose.Types.ObjectId[]) => ids.length <= 10 && new Set(ids.map(String)).size === ids.length, message: "Choose at most 10 distinct moods." } },
    instrumentIds: { type: [{ type: Schema.Types.ObjectId, ref: "Instrument" }], default: [], validate: { validator: (ids: mongoose.Types.ObjectId[]) => ids.length <= 20 && new Set(ids.map(String)).size === ids.length, message: "Choose at most 20 distinct instruments." } },
    durationSeconds: { type: Number, min: 0 },
    isExplicit: { type: Boolean, default: false },
  },
  { _id: false },
);

const trackSchema = new Schema<TrackFields>(
  {
    producerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 160 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 4_000 },
    artwork: { type: objectStorageAssetSchema, required: false },
    audio: {
      preview: { type: objectStorageAssetSchema, required: false },
      master: { type: objectStorageAssetSchema, required: false, select: false },
      stems: { type: [objectStorageAssetSchema], default: [], select: false },
      previewStartSeconds: { type: Number, required: true, default: 0, min: 0 },
      previewDurationSeconds: { type: Number, required: true, default: 30, enum: [30] },
    },
    metadata: { type: trackMetadataSchema, required: true },
    visibility: { type: String, enum: ["PUBLIC", "PRIVATE"], default: "PRIVATE", index: true },
    status: { type: String, enum: ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"], default: "DRAFT", index: true },
    releaseDate: { type: Date, default: null, index: true },
    publishedAt: { type: Date, default: null },
    collaborators: {
      type: [collaboratorSchema],
      default: [],
      validate: [
        {
          validator: (collaborators: TrackCollaborator[]) =>
            new Set(collaborators.map((collaborator) => String(collaborator.userId))).size === collaborators.length,
          message: "A user can only appear once in a track's collaborators.",
        },
        {
          validator: (collaborators: TrackCollaborator[]) =>
            collaborators.reduce((total, collaborator) => total + collaborator.revenueSharePercentage, 0) <= 100,
          message: "Collaborator revenue shares cannot total more than 100%.",
        },
      ],
    },
  },
  { timestamps: true, optimisticConcurrency: true, toJSON: { transform: transformMongoDocument } },
);

trackSchema.pre("validate", function validatePublishableTrack() {
  const normalizedKey = normalizeMusicalKey(this.metadata?.musicalKey);
  if (normalizedKey && normalizedKey !== this.metadata.musicalKey) this.metadata.musicalKey = normalizedKey;

  if (this.status === "SCHEDULED" && !this.releaseDate) {
    this.invalidate("releaseDate", "A scheduled track requires a release date.");
  }

  if (this.status === "SCHEDULED" && this.releaseDate && this.releaseDate <= new Date()) {
    this.invalidate("releaseDate", "A scheduled track's release date must be in the future.");
  }

  if (this.status === "PUBLISHED") {
    if (!this.metadata.genreId) this.invalidate("metadata.genreId", "A published track requires a genre.");
    if (!this.artwork) this.invalidate("artwork", "A published track requires artwork.");
    if (!this.audio.preview) this.invalidate("audio.preview", "A published track requires preview audio.");
    if (!this.audio.master) this.invalidate("audio.master", "A published track requires a private master file.");
    if (this.audio.preview?.durationSeconds !== 30 || this.audio.previewDurationSeconds !== 30) {
      this.invalidate("audio.preview", "A published track requires an exact 30-second preview.");
    }
    if (!this.metadata.durationSeconds || this.audio.previewStartSeconds + 30 > this.metadata.durationSeconds + 0.001) {
      this.invalidate("audio.previewStartSeconds", "The 30-second preview must fit inside the master file.");
    }
    if (this.releaseDate && this.releaseDate > new Date()) {
      this.invalidate("releaseDate", "Use SCHEDULED status for a future release date.");
    }
  }

  if (this.collaborators.some((collaborator) => String(collaborator.userId) === String(this.producerId))) {
    this.invalidate("collaborators", "The producer must not also be listed as a collaborator.");
  }
});

trackSchema.pre("save", function setPublishedAt() {
  if (this.status === "PUBLISHED" && !this.publishedAt) this.publishedAt = new Date();
});

trackSchema.set("optimisticConcurrency", true);
installTrackSearch(trackSchema);
trackSchema.index({ createdAt: -1, _id: -1 });
trackSchema.index({ visibility: 1, status: 1, releaseDate: -1 });
trackSchema.index({ producerId: 1, status: 1, createdAt: -1 });
trackSchema.index({ "metadata.genreId": 1, status: 1 });
trackSchema.index({ "metadata.moodIds": 1, status: 1 });
trackSchema.index({ "metadata.instrumentIds": 1, status: 1 });
trackSchema.index({ title: "text", description: "text", "metadata.tags": "text" });
trackSchema.index({ visibility: 1, status: 1, createdAt: -1, _id: -1 });
trackSchema.index({ visibility: 1, status: 1, "metadata.genreId": 1, createdAt: -1, _id: -1 });
// Each compound index contains one array field; combining both arrays is invalid in MongoDB.
trackSchema.index({ visibility: 1, status: 1, "metadata.moodIds": 1, createdAt: -1, _id: -1 }, { name: "discovery_mood_newest" });
trackSchema.index({ visibility: 1, status: 1, "metadata.instrumentIds": 1, createdAt: -1, _id: -1 }, { name: "discovery_instrument_newest" });
trackSchema.index({ producerId: 1, createdAt: -1, _id: -1 });
trackSchema.index({ "audio.preview.key": 1 }, { sparse: true });
trackSchema.index({ "artwork.key": 1 }, { sparse: true });

// A retained development model cannot acquire middleware through schema.add().
// Recompile its in-memory definition once when introducing the derived search fields.
// Existing records, connections and indexes remain untouched.
if (process.env.NODE_ENV !== "production" && mongoose.models.Track && !mongoose.models.Track.schema.path("search.tokens")) {
  mongoose.deleteModel("Track");
}
const TrackModel = (mongoose.models.Track as Model<TrackFields> | undefined) ?? mongoose.model<TrackFields>("Track", trackSchema);

export default TrackModel;
