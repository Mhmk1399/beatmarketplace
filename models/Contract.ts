import mongoose, { type HydratedDocument, type Model, Schema } from "mongoose";

import { transformMongoDocument } from "@/models/schemas/shared";

export type DeliverableFormat = "MP3" | "WAV" | "STEMS" | "MIDI" | "PROJECT_FILE" | "OTHER";
export type LicenseType = "NON_EXCLUSIVE" | "EXCLUSIVE" | "CUSTOM";

export type ContractDeliverable = {
  format: DeliverableFormat;
  label: string;
  required: boolean;
};

export type ContractFields = {
  producerId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  offerable: boolean;
  price: mongoose.Types.Decimal128;
  minimumOfferPrice: mongoose.Types.Decimal128 | null;
  currency: string;
  filesToDeliver: ContractDeliverable[];
  territory: {
    worldwide: boolean;
    includedCountries: string[];
    excludedCountries: string[];
  };
  trackIds: mongoose.Types.ObjectId[];
  terms: {
    licenseType: LicenseType;
    commercialUse: boolean;
    creditText?: string;
    contentIdAllowed?: boolean | null;
    termMonths?: number | null;
    royaltyPercent?: number | null;
    publishingSharePercent?: number | null;
    governingLaw?: string;
    creditRequired: boolean;
    distributionLimit: number | null;
    streamingLimit: number | null;
    musicVideoLimit: number | null;
    livePerformance: boolean;
    broadcastRights: boolean;
    customTerms: string;
  };
  version: number;
  isActive: boolean;
  effectiveFrom: Date;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ContractDocument = HydratedDocument<ContractFields>;

function transformContract(_document: unknown, returnedObject: unknown) {
  transformMongoDocument(_document, returnedObject);
  const result = returnedObject as Record<string, unknown>;

  if (result.price instanceof mongoose.Types.Decimal128) result.price = result.price.toString();
  if (result.minimumOfferPrice instanceof mongoose.Types.Decimal128) {
    result.minimumOfferPrice = result.minimumOfferPrice.toString();
  }
}

const deliverableSchema = new Schema<ContractDeliverable>(
  {
    format: { type: String, enum: ["MP3", "WAV", "STEMS", "MIDI", "PROJECT_FILE", "OTHER"], required: true },
    label: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    required: { type: Boolean, default: true },
  },
  { _id: false },
);

const contractSchema = new Schema<ContractFields>(
  {
    producerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 160 },
    description: { type: String, default: "", maxlength: 8_000 },
    offerable: { type: Boolean, default: false, index: true },
    price: { type: Schema.Types.Decimal128, required: true },
    minimumOfferPrice: { type: Schema.Types.Decimal128, default: null },
    currency: { type: String, required: true, uppercase: true, trim: true, enum: ["IRT"], default: "IRT" },
    filesToDeliver: {
      type: [deliverableSchema],
      required: true,
      validate: {
        validator: (files: ContractDeliverable[]) => files.length > 0,
        message: "A contract requires at least one deliverable file type.",
      },
    },
    territory: {
      worldwide: { type: Boolean, default: true },
      includedCountries: [{ type: String, uppercase: true, trim: true, match: /^[A-Z]{2}$/ }],
      excludedCountries: [{ type: String, uppercase: true, trim: true, match: /^[A-Z]{2}$/ }],
    },
    trackIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Track" }],
      required: true,
      validate: [
        {
          validator: (trackIds: mongoose.Types.ObjectId[]) => trackIds.length > 0,
          message: "A contract must apply to at least one track.",
        },
        {
          validator: (trackIds: mongoose.Types.ObjectId[]) => new Set(trackIds.map(String)).size === trackIds.length,
          message: "A track can only appear once in a contract.",
        },
      ],
    },
    terms: {
      licenseType: { type: String, enum: ["NON_EXCLUSIVE", "EXCLUSIVE", "CUSTOM"], default: "NON_EXCLUSIVE" },
      creditText: { type: String, default: "", maxlength: 500 },
      contentIdAllowed: { type: Boolean, default: null },
      termMonths: { type: Number, default: null, min: 1, max: 1200 },
      royaltyPercent: { type: Number, default: null, min: 0, max: 100 },
      publishingSharePercent: { type: Number, default: null, min: 0, max: 100 },
      governingLaw: { type: String, default: "", maxlength: 500 },
      commercialUse: { type: Boolean, default: true },
      creditRequired: { type: Boolean, default: true },
      distributionLimit: { type: Number, default: null, min: 0 },
      streamingLimit: { type: Number, default: null, min: 0 },
      musicVideoLimit: { type: Number, default: null, min: 0 },
      livePerformance: { type: Boolean, default: false },
      broadcastRights: { type: Boolean, default: false },
      customTerms: { type: String, default: "", maxlength: 20_000 },
    },
    version: { type: Number, default: 1, min: 1 },
    isActive: { type: Boolean, default: true, index: true },
    effectiveFrom: { type: Date, default: Date.now, required: true },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true, optimisticConcurrency: true, toJSON: { transform: transformContract } },
);

contractSchema.pre("validate", function validateContractRules() {
  const price = Number(this.price?.toString());
  const minimumOfferPrice = this.minimumOfferPrice === null ? null : Number(this.minimumOfferPrice.toString());

  if (!Number.isFinite(price) || price < 0) {
    this.invalidate("price", "Price must be a non-negative decimal amount.");
  }

  if (this.offerable && this.minimumOfferPrice === null) {
    this.invalidate("minimumOfferPrice", "An offerable contract requires a minimum offer price.");
  }

  if (minimumOfferPrice !== null && (!Number.isFinite(minimumOfferPrice) || minimumOfferPrice < 0)) {
    this.invalidate("minimumOfferPrice", "Minimum offer price must be a non-negative decimal amount.");
  }

  if (minimumOfferPrice !== null && minimumOfferPrice > price) {
    this.invalidate("minimumOfferPrice", "Minimum offer price cannot exceed the listed price.");
  }

  if (!this.territory.worldwide && this.territory.includedCountries.length === 0) {
    this.invalidate("territory.includedCountries", "Select at least one country when the contract is not worldwide.");
  }

  const excludedCountries = new Set(this.territory.excludedCountries);
  if (this.territory.includedCountries.some((countryCode) => excludedCountries.has(countryCode))) {
    this.invalidate("territory", "A country cannot be both included and excluded.");
  }

  if (this.expiresAt && this.expiresAt <= this.effectiveFrom) {
    this.invalidate("expiresAt", "Contract expiration must be later than its effective date.");
  }
});

contractSchema.index({ producerId: 1, isActive: 1, createdAt: -1 });
contractSchema.index({ producerId: 1, createdAt: -1, _id: -1 });
contractSchema.index({ trackIds: 1, isActive: 1 });
contractSchema.index({ trackIds: 1, isActive: 1, price: 1, _id: 1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.Contract && !mongoose.models.Contract.schema.path("terms.termMonths")) mongoose.deleteModel("Contract");
const ContractModel =
  (mongoose.models.Contract as Model<ContractFields> | undefined) ?? mongoose.model<ContractFields>("Contract", contractSchema);

export default ContractModel;
