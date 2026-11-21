import mongoose, { type Model, Schema } from "mongoose";

type ApiRateLimitFields = { _id: string; count: number; expiresAt: Date };
const schema = new Schema<ApiRateLimitFields>({
  _id: { type: String, required: true },
  count: { type: Number, required: true },
  expiresAt: { type: Date, required: true },
}, { versionKey: false });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default (mongoose.models.ApiRateLimit as Model<ApiRateLimitFields> | undefined) ?? mongoose.model<ApiRateLimitFields>("ApiRateLimit", schema);
