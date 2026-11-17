import mongoose, { Schema } from "mongoose";
const schema = new Schema({ userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, trackId: { type: Schema.Types.ObjectId, ref: "Track", required: true } }, { timestamps: true });
schema.index({ userId: 1, trackId: 1 }, { unique: true });
const FavoriteModel = mongoose.models.Favorite ?? mongoose.model("Favorite", schema);
export default FavoriteModel;
