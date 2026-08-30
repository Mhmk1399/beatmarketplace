// Domain types for the marketplace MVP.
// These models are intentionally simple but structured enough to grow into a
// fuller ownership, licensing, and publishing model without major rewrites.
export type UserRole = "USER" | "PRODUCER" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

export type StoredAsset = {
  provider: "S3" | "R2" | "GCS" | "AZURE" | "OTHER";
  bucket: string;
  key: string;
  publicUrl?: string;
  mimeType: string;
  originalFileName: string;
  sizeBytes: number;
  checksum?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  uploadedAt: string;
};

export type ProducerProfile = {
  id: string;
  userId: string;
  stageName: string;
  bio: string;
  genreIds: string[];
  storefrontName: string;
  createdAt: string;
  updatedAt: string;
};

export type User = {
  id: string;
  email: string;
  phoneNumber?: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  status: UserStatus;
  profile: {
    username?: string;
    displayName?: string;
    bio: string;
    avatar?: StoredAsset;
    banner?: StoredAsset;
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
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};
