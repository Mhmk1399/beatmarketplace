import mongoose, { Schema, type Model } from "mongoose";

type TrackRoute = { _id: string; trackId: mongoose.Types.ObjectId; createdAt: Date };
const schema = new Schema<TrackRoute>({
  _id: { type: String, required: true, maxlength: 200 },
  trackId: { type: Schema.Types.ObjectId, ref: "Track", required: true, index: true },
}, { versionKey: false, timestamps: { createdAt: true, updatedAt: false } });

// Both current names and former names remain reserved for the same immutable beat ID.
export default (mongoose.models.TrackRoute as Model<TrackRoute> | undefined) ?? mongoose.model<TrackRoute>("TrackRoute", schema);
