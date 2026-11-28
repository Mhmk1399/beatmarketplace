import mongoose, { type Model, Schema } from "mongoose";
import {
  objectStorageAssetSchema,
  type ObjectStorageAsset,
} from "@/models/schemas/shared";

export type OrderDiscountSnapshot = {
  id: string;
  percentage: number;
  version: number;
  startsAt: Date;
  endsAt: Date;
};
export type OrderItem = {
  trackId: mongoose.Types.ObjectId;
  producerId: mongoose.Types.ObjectId;
  title: string;
  contractId: mongoose.Types.ObjectId;
  contractVersion: number;
  licenseTitle: string;
  price: number;
  revenueAllocations?: { userId: mongoose.Types.ObjectId; amount: number }[];
  originalPrice?: number;
  discountAmount?: number;
  discount?: OrderDiscountSnapshot;
  terms: string;
  agreement?: string;
  agreementVersion?: number;
  master?: ObjectStorageAsset;
  deliverables?: {
    format: "MP3" | "WAV" | "STEMS";
    asset: ObjectStorageAsset;
    name: string;
  }[];
};
export type OrderFields = {
  settlements?: { itemIndex: number; producerId: mongoose.Types.ObjectId; amount: number; reference: string; recordedBy: mongoose.Types.ObjectId; recordedAt: Date }[];
  buyerId: mongoose.Types.ObjectId;
  idempotencyKey: string;
  items: OrderItem[];
  total: number;
  currency: "IRT";
  status: "PENDING" | "PAID" | "CANCELLED";
  authority?: string;
  referenceId?: string;
  gatewayMode: "sandbox" | "live";
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};
const itemSchema = new Schema<OrderItem>(
  {
    trackId: { type: Schema.Types.ObjectId, required: true },
    producerId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    contractId: { type: Schema.Types.ObjectId, required: true },
    contractVersion: { type: Number, required: true },
    licenseTitle: { type: String, required: true },
    price: { type: Number, required: true, min: 1 },
    revenueAllocations: {
      type: [{ _id: false, userId: { type: Schema.Types.ObjectId, required: true }, amount: { type: Number, required: true, min: 0 } }],
      default: undefined,
    },
    originalPrice: { type: Number, min: 1 },
    discountAmount: { type: Number, min: 0 },
    discount: {
      type: new Schema<OrderDiscountSnapshot>(
        {
          id: { type: String, required: true },
          percentage: { type: Number, required: true, min: 1, max: 90 },
          version: { type: Number, required: true },
          startsAt: { type: Date, required: true },
          endsAt: { type: Date, required: true },
        },
        { _id: false },
      ),
      required: false,
    },
    agreement: { type: String, select: false },
    agreementVersion: { type: Number },
    terms: { type: String, required: true },
    master: { type: objectStorageAssetSchema, required: false, select: false },
    deliverables: {
      type: [
        new Schema(
          {
            format: {
              type: String,
              enum: ["MP3", "WAV", "STEMS"],
              required: true,
            },
            asset: { type: objectStorageAssetSchema, required: true },
            name: { type: String, required: true, maxlength: 255 },
          },
          { _id: false },
        ),
      ],
      default: undefined,
      select: false,
    },
  },
  { _id: false },
);
const schema = new Schema<OrderFields>(
  {
    settlements: {
      type: [new Schema({
        itemIndex: { type: Number, required: true, min: 0 },
        producerId: { type: Schema.Types.ObjectId, required: true },
        amount: { type: Number, required: true, min: 1 },
        reference: { type: String, required: true, maxlength: 160 },
        recordedBy: { type: Schema.Types.ObjectId, required: true },
        recordedAt: { type: Date, required: true },
      }, { _id: false })],
      select: false,
    },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: { type: [itemSchema], required: true },
    idempotencyKey: { type: String, required: true },
    total: { type: Number, required: true, min: 1000 },
    currency: { type: String, enum: ["IRT"], default: "IRT" },
    status: {
      type: String,
      enum: ["PENDING", "PAID", "CANCELLED"],
      default: "PENDING",
    },
    authority: { type: String, unique: true, sparse: true },
    referenceId: String,
    gatewayMode: { type: String, enum: ["sandbox", "live"], required: true },
    paidAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform(_document, returned) {
        for (const item of returned.items ?? []) {
          delete (item as { master?: unknown }).master;
          delete (item as { deliverables?: unknown }).deliverables;
          delete (item as { agreement?: unknown }).agreement;
        }
      },
    },
  },
);
schema.index({ buyerId: 1, createdAt: -1 });
schema.index({ buyerId: 1, idempotencyKey: 1 }, { unique: true });
schema.index({ createdAt: -1, _id: -1 });
schema.index({ "items.producerId": 1, createdAt: -1, _id: -1 });
schema.index({ status: 1, gatewayMode: 1, paidAt: -1 });
if (
  process.env.NODE_ENV !== "production" &&
  mongoose.models.Order &&
  !mongoose.models.Order.schema.path("items.agreement")
)
  mongoose.deleteModel("Order");
const OrderModel =
  (mongoose.models.Order as Model<OrderFields> | undefined) ??
  mongoose.model<OrderFields>("Order", schema);
export default OrderModel;
