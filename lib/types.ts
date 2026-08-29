// Domain types for the marketplace MVP.
// These models are intentionally simple but structured enough to grow into a
// fuller ownership, licensing, and publishing model without major rewrites.
export type UserRole = "USER" | "PRODUCER" | "ADMIN";

export type BeatStatus = "DRAFT" | "PROCESSING" | "PUBLISHED" | "UNPUBLISHED" | "ARCHIVED";

export type License = {
  id: string;
  name: string;
  price: number;
  currency: string;
  allowedFiles: string[];
  usageRights: string;
  commercialUse: boolean;
  distributionLimit: string;
  streamingLimit: string;
  createdAt: string;
};

export type Beat = {
  id: string;
  producerId: string;
  title: string;
  slug: string;
  description: string;
  genre: string;
  mood: string;
  bpm: number;
  key: string;
  tags: string[];
  coverUrl: string | null;
  previewUrl: string | null;
  masterUrl: string | null;
  status: BeatStatus;
  licenses: License[];
  createdAt: string;
  updatedAt: string;
};

export type ProducerProfile = {
  id: string;
  userId: string;
  stageName: string;
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  location: string | null;
  genres: string[];
  socialLinks: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    spotify?: string;
  };
  storefrontName: string;
  createdAt: string;
  updatedAt: string;
};

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};
