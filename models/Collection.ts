import mongoose, { type Model, Schema } from "mongoose";
type Fields = { userId: mongoose.Types.ObjectId; name: string; description: string; trackIds: mongoose.Types.ObjectId[]; version: number; createdAt: Date; updatedAt: Date };
const schema = new Schema<Fields>({ userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 }, description: { type: String, default: "", trim: true, maxlength: 1000 }, trackIds: { type: [Schema.Types.ObjectId], ref: "Track", default: [], validate: (value: mongoose.Types.ObjectId[]) => value.length <= 100 }, version: { type: Number, default: 1, min: 1 } }, { timestamps: true, versionKey: false });
schema.index({ userId: 1, createdAt: -1, _id: -1 });
const CollectionModel = (mongoose.models.Collection as Model<Fields> | undefined) ?? mongoose.model<Fields>("Collection", schema);
export default CollectionModel;
