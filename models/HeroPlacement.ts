import mongoose, { type HydratedDocument, type Model, Schema } from "mongoose";
import { transformMongoDocument } from "@/models/schemas/shared";
import type { HeroPaymentStatus } from "@/lib/hero/types";

export type HeroPlacementFields = {
  trackId: mongoose.Types.ObjectId;
  position: number;
  label: string;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  agreedFeeToman: number;
  paymentStatus: HeroPaymentStatus;
  paymentReference: string;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};
export type HeroPlacementDocument = HydratedDocument<HeroPlacementFields>;

const schema = new Schema<HeroPlacementFields>({
  trackId: { type: Schema.Types.ObjectId, ref: "Track", required: true },
  position: { type: Number, required: true, default: 0, min: 0, max: 10_000, validate: Number.isInteger },
  label: { type: String, trim: true, maxlength: 40, default: "Featured" },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  isActive: { type: Boolean, required: true, default: true },
  agreedFeeToman: { type: Number, required: true, default: 0, min: 0, max: 1_000_000_000, validate: Number.isInteger },
  paymentStatus: { type: String, enum: ["PENDING", "PAID", "COMPLIMENTARY"], required: true, default: "PENDING" },
  paymentReference: { type: String, trim: true, maxlength: 160, default: "" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  version: { type: Number, required: true, default: 1, min: 1 },
}, { timestamps: true, optimisticConcurrency: true, toJSON: { transform: transformMongoDocument } });

schema.pre("validate", function validateBooking() {
  if (this.startsAt && this.endsAt && this.endsAt <= this.startsAt) this.invalidate("endsAt", "The placement must end after it starts.");
  if (this.startsAt && this.endsAt && this.endsAt.getTime() - this.startsAt.getTime() > 366 * 86400_000) this.invalidate("endsAt", "Placements can last at most 366 days.");
  if (this.paymentStatus === "PAID" && this.agreedFeeToman < 1) this.invalidate("agreedFeeToman", "A paid placement needs a positive agreed fee.");
});
schema.index({ isActive: 1, paymentStatus: 1, endsAt: 1, startsAt: 1, position: 1, _id: 1 });
schema.index({ position: 1, startsAt: -1, _id: -1 });
schema.index({ trackId: 1, startsAt: -1, endsAt: -1 });

const HeroPlacementModel = (mongoose.models.HeroPlacement as Model<HeroPlacementFields> | undefined) ?? mongoose.model<HeroPlacementFields>("HeroPlacement", schema);
export default HeroPlacementModel;
