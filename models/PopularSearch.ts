import mongoose, { Schema } from "mongoose";
const popularSchema = new Schema({ term: { type: String, required: true, maxlength: 100, unique: true }, count: { type: Number, default: 0, min: 0 }, lastSearchedAt: { type: Date, required: true } }, { versionKey: false });
popularSchema.index({ count: -1, lastSearchedAt: -1 });
popularSchema.index({ lastSearchedAt: 1 }, { expireAfterSeconds: 90 * 86400 });
const receiptSchema = new Schema({ _id: { type: String, required: true }, terms: { type: [String], default: [] }, expiresAt: { type: Date, required: true } }, { versionKey: false });
receiptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const SearchReceiptModel = mongoose.models.SearchReceipt ?? mongoose.model("SearchReceipt", receiptSchema);
const PopularSearchModel = mongoose.models.PopularSearch ?? mongoose.model("PopularSearch", popularSchema);
export default PopularSearchModel;
