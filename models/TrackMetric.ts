import mongoose, { type Model, Schema } from "mongoose";

export type TrackMetricFields = {
  _id: mongoose.Types.ObjectId;
  views: number;
  uniqueVisitors: number;
  lastViewedAt: Date;
};

// A small counter document per beat keeps analytics writes off the editable track.
const schema = new Schema<TrackMetricFields>({
  _id: { type: Schema.Types.ObjectId, ref: "Track", required: true },
  views: { type: Number, default: 0, min: 0 },
  uniqueVisitors: { type: Number, default: 0, min: 0 },
  lastViewedAt: { type: Date, required: true },
}, { versionKey: false });

schema.index({ views: -1, _id: 1 }, { name: "track_metric_top_views" });

const TrackMetricModel = (mongoose.models.TrackMetric as Model<TrackMetricFields> | undefined) ?? mongoose.model<TrackMetricFields>("TrackMetric", schema);
export default TrackMetricModel;
