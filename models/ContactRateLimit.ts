import mongoose, { type Model, Schema } from "mongoose";

type ContactRateLimitFields = { _id: string; count: number; expiresAt: Date };
const schema = new Schema<ContactRateLimitFields>({
  _id: { type: String, required: true },
  count: { type: Number, required: true, min: 1 },
  expiresAt: { type: Date, required: true },
}, { versionKey: false });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const ContactRateLimitModel = (mongoose.models.ContactRateLimit as Model<ContactRateLimitFields> | undefined) ?? mongoose.model<ContactRateLimitFields>("ContactRateLimit", schema);
export default ContactRateLimitModel;
