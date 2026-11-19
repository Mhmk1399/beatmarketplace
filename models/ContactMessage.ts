import mongoose, { type Model, Schema } from "mongoose";
import { CONTACT_STATUSES, CONTACT_SUBJECTS, type ContactStatus, type ContactSubject } from "@/lib/contact/types";

export type ContactMessageFields = {
  _id: string; name: string; email: string; subject: ContactSubject; message: string;
  payloadHash: string; status: ContactStatus; version: number;
  updatedBy: mongoose.Types.ObjectId | null; createdAt: Date; updatedAt: Date;
};
const schema = new Schema<ContactMessageFields>({
  // The client UUID is a durable retry key. MongoDB's primary-key index prevents duplicates.
  _id: { type: String, required: true, validate: (value: string) => /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value) },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  subject: { type: String, enum: CONTACT_SUBJECTS.map(subject => subject.value), required: true },
  message: { type: String, required: true, trim: true, minlength: 10, maxlength: 5000 },
  payloadHash: { type: String, required: true, select: false },
  status: { type: String, enum: CONTACT_STATUSES, default: "NEW", required: true },
  version: { type: Number, required: true, default: 1, min: 1 },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null, select: false },
}, { timestamps: true, versionKey: false });
schema.index({ createdAt: -1, _id: -1 });
schema.index({ status: 1, createdAt: -1, _id: -1 });
const ContactMessageModel = (mongoose.models.ContactMessage as Model<ContactMessageFields> | undefined) ?? mongoose.model<ContactMessageFields>("ContactMessage", schema);
export default ContactMessageModel;
