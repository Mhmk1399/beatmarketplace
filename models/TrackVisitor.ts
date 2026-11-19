import mongoose, { type Model, Schema } from "mongoose";

export type TrackVisitorFields = { _id: string; lastViewedAt: Date };

// One irreversible, beat-specific hash per distinct browser, rather than a log of every view.
// Retain this minimal state so lifetime unique counts do not inflate when a TTL expires.
const schema = new Schema<TrackVisitorFields>({
  _id: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
  lastViewedAt: { type: Date, required: true },
}, { versionKey: false });

const TrackVisitorModel = (mongoose.models.TrackVisitor as Model<TrackVisitorFields> | undefined) ?? mongoose.model<TrackVisitorFields>("TrackVisitor", schema);
export default TrackVisitorModel;
