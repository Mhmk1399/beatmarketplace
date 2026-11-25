import mongoose, { type Model, Schema } from "mongoose";
import { objectStorageAssetSchema, type ObjectStorageAsset } from "@/models/schemas/shared";

type HomeMediaFields = { _id: string; asset: ObjectStorageAsset };

const schema = new Schema<HomeMediaFields>({
  _id: { type: String, required: true, match: /^[a-z0-9-]{1,80}$/ },
  asset: { type: objectStorageAssetSchema, required: true },
}, { timestamps: true, versionKey: false });

const HomeMediaModel = (mongoose.models.HomeMedia as Model<HomeMediaFields> | undefined) ??
  mongoose.model<HomeMediaFields>("HomeMedia", schema);

export default HomeMediaModel;
