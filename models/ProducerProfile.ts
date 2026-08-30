import mongoose, { type HydratedDocument, type Model, Schema } from "mongoose";

export type ProducerProfileFields = {
  userId: mongoose.Types.ObjectId;
  stageName: string;
  bio: string;
  genreIds: mongoose.Types.ObjectId[];
  storefrontName: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProducerProfileDocument = HydratedDocument<ProducerProfileFields>;

const producerProfileSchema = new Schema<ProducerProfileFields>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    stageName: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    bio: { type: String, default: "", maxlength: 1_000 },
    genreIds: [{ type: Schema.Types.ObjectId, ref: "Genre" }],
    storefrontName: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_document, returnedObject) => {
        const result = returnedObject as Record<string, unknown>;
        result.id = String(result._id);
        result.userId = String(result.userId);
        delete result._id;
        delete result.__v;
      },
    },
  },
);

producerProfileSchema.index({ genreIds: 1 });

const ProducerProfileModel =
  (mongoose.models.ProducerProfile as Model<ProducerProfileFields> | undefined) ??
  mongoose.model<ProducerProfileFields>("ProducerProfile", producerProfileSchema);

export default ProducerProfileModel;
