import mongoose, { type HydratedDocument, type Model, Schema } from "mongoose";
import { transformMongoDocument } from "@/models/schemas/shared";

export type TrackDiscountFields = {
  trackId: mongoose.Types.ObjectId;
  producerId: mongoose.Types.ObjectId;
  percentage: number;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};
export type TrackDiscountDocument = HydratedDocument<TrackDiscountFields>;

const schema = new Schema<TrackDiscountFields>({
  trackId: { type: Schema.Types.ObjectId, ref: "Track", required: true, unique: true },
  producerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  percentage: { type: Number, required: true, min: 1, max: 90, validate: { validator: Number.isInteger, message: "Use a whole discount percentage." } },
  startsAt: { type: Date, required: true }, endsAt: { type: Date, required: true },
  isActive: { type: Boolean, required: true, default: true },
  version: { type: Number, required: true, default: 1, min: 1 },
}, { timestamps: true, optimisticConcurrency: true, toJSON: { transform: transformMongoDocument } });
schema.pre("validate", function validateDates() {
  if (this.startsAt && this.endsAt && this.endsAt <= this.startsAt) this.invalidate("endsAt", "The discount must end after it starts.");
  if (this.startsAt && this.endsAt && this.endsAt.getTime() - this.startsAt.getTime() > 90 * 86400_000) this.invalidate("endsAt", "Discounts can last at most 90 days.");
});
schema.index({ producerId: 1, createdAt: -1, _id: -1 });
schema.index({ isActive: 1, endsAt: 1, startsAt: 1 });

const TrackDiscountModel = (mongoose.models.TrackDiscount as Model<TrackDiscountFields> | undefined) ?? mongoose.model<TrackDiscountFields>("TrackDiscount", schema);
export default TrackDiscountModel;
