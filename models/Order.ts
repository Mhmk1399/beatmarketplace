import mongoose, { type Model, Schema } from "mongoose";
import { objectStorageAssetSchema, type ObjectStorageAsset } from "@/models/schemas/shared";

export type OrderDiscountSnapshot = { id: string; percentage: number; version: number; startsAt: Date; endsAt: Date };
export type OrderItem = { trackId: mongoose.Types.ObjectId; producerId: mongoose.Types.ObjectId; title: string; contractId: mongoose.Types.ObjectId; contractVersion: number; licenseTitle: string; price: number; originalPrice?: number; discountAmount?: number; discount?: OrderDiscountSnapshot; terms: string; master: ObjectStorageAsset };
export type OrderFields = { buyerId: mongoose.Types.ObjectId; idempotencyKey: string; items: OrderItem[]; total: number; currency: "IRT"; status: "PENDING" | "PAID" | "CANCELLED"; authority?: string; referenceId?: string; gatewayMode: "sandbox" | "live"; paidAt?: Date; createdAt: Date; updatedAt: Date };
const itemSchema = new Schema<OrderItem>({
  trackId: { type: Schema.Types.ObjectId, required: true }, producerId: { type: Schema.Types.ObjectId, required: true }, title: { type: String, required: true },
  contractId: { type: Schema.Types.ObjectId, required: true }, contractVersion: { type: Number, required: true }, licenseTitle: { type: String, required: true },
  price: { type: Number, required: true, min: 1 }, originalPrice: { type: Number, min: 1 }, discountAmount: { type: Number, min: 0 },
  discount: { type: new Schema<OrderDiscountSnapshot>({ id: { type: String, required: true }, percentage: { type: Number, required: true, min: 1, max: 90 }, version: { type: Number, required: true }, startsAt: { type: Date, required: true }, endsAt: { type: Date, required: true } }, { _id: false }), required: false },
  terms: { type: String, required: true }, master: { type: objectStorageAssetSchema, required: true, select: false },
}, { _id: false });
const schema = new Schema<OrderFields>({
  buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }, items: { type: [itemSchema], required: true },
  idempotencyKey: { type: String, required: true },
  total: { type: Number, required: true, min: 1000 }, currency: { type: String, enum: ["IRT"], default: "IRT" },
  status: { type: String, enum: ["PENDING", "PAID", "CANCELLED"], default: "PENDING" },
  authority: { type: String, unique: true, sparse: true }, referenceId: String,
  gatewayMode: { type: String, enum: ["sandbox", "live"], required: true }, paidAt: Date,
}, { timestamps: true });
schema.index({ buyerId: 1, createdAt: -1 });
schema.index({ buyerId: 1, idempotencyKey: 1 }, { unique: true });
schema.index({ createdAt: -1, _id: -1 });
schema.index({ "items.producerId": 1, createdAt: -1, _id: -1 });
schema.index({ status: 1, gatewayMode: 1, paidAt: -1 });
const OrderModel = (mongoose.models.Order as Model<OrderFields> | undefined) ?? mongoose.model<OrderFields>("Order", schema);
export default OrderModel;
