import mongoose, { type HydratedDocument, type Model, Schema } from "mongoose";

import type { UserRole } from "@/lib/types";
import { objectStorageAssetSchema, type ObjectStorageAsset } from "@/models/schemas/shared";

export type UserStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

export type UserProfile = {
  username?: string;
  displayName?: string;
  bio: string;
  avatar?: ObjectStorageAsset;
  banner?: ObjectStorageAsset;
  location?: {
    city?: string;
    countryCode?: string;
  };
  website?: string;
  socialLinks: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    spotify?: string;
    soundcloud?: string;
    tiktok?: string;
  };
};

export type UserFields = {
  email: string;
  passwordHash: string;
  phoneNumber?: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  status: UserStatus;
  profile: UserProfile;
  lastLoginAt: Date | null;
  sessionVersion: number;
  preferences: { emailNotifications: boolean; showActivity: boolean };
  createdAt: Date;
  updatedAt: Date;
};

export type UserDocument = HydratedDocument<UserFields>;

const userProfileSchema = new Schema<UserProfile>(
  {
    username: { type: String, lowercase: true, trim: true, minlength: 3, maxlength: 40, match: /^[a-z0-9_]+$/ },
    displayName: { type: String, trim: true, maxlength: 120 },
    bio: { type: String, default: "", maxlength: 1_000 },
    avatar: { type: objectStorageAssetSchema, required: false },
    banner: { type: objectStorageAssetSchema, required: false },
    location: {
      city: { type: String, trim: true, maxlength: 120 },
      countryCode: { type: String, uppercase: true, trim: true, match: /^[A-Z]{2}$/ },
    },
    website: { type: String, trim: true, maxlength: 2_048 },
    socialLinks: {
      instagram: { type: String, trim: true, maxlength: 2_048 },
      twitter: { type: String, trim: true, maxlength: 2_048 },
      youtube: { type: String, trim: true, maxlength: 2_048 },
      spotify: { type: String, trim: true, maxlength: 2_048 },
      soundcloud: { type: String, trim: true, maxlength: 2_048 },
      tiktok: { type: String, trim: true, maxlength: 2_048 },
    },
  },
  { _id: false },
);

const userSchema = new Schema<UserFields>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    phoneNumber: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
      minlength: 8,
      maxlength: 16,
      match: /^\+[1-9]\d{7,14}$/,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    firstName: {
      type: String,
      trim: true,
      minlength: 1,
      maxlength: 80,
    },
    lastName: {
      type: String,
      trim: true,
      minlength: 1,
      maxlength: 80,
    },
    roles: {
      type: [String],
      enum: ["USER", "PRODUCER", "ADMIN"],
      default: ["USER"],
      required: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
      required: true,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "DEACTIVATED"],
      default: "ACTIVE",
      required: true,
      index: true,
    },
    profile: {
      type: userProfileSchema,
      default: () => ({ bio: "", socialLinks: {} }),
      required: true,
    },
    lastLoginAt: { type: Date, default: null },
    sessionVersion: { type: Number, default: 0, min: 0, select: false },
    preferences: { emailNotifications: { type: Boolean, default: false }, showActivity: { type: Boolean, default: false } },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_document, returnedObject) => {
        const result = returnedObject as Record<string, unknown>;
        result.id = String(result._id);
        delete result._id;
        delete result.__v;
        delete result.passwordHash;
      },
    },
  },
);

userSchema.index({ "profile.username": 1 }, { unique: true, sparse: true });
userSchema.index({ createdAt: -1, _id: -1 });
userSchema.index({ roles: 1, status: 1, createdAt: -1, _id: -1 });

const UserModel = (mongoose.models.User as Model<UserFields> | undefined) ?? mongoose.model<UserFields>("User", userSchema);

export default UserModel;
