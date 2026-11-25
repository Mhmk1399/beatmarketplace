import type { LicenseConditions } from "@/lib/licensing/conditions";
export type TrackDiscount = {
  id: string;
  trackId: string;
  percentage: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  version: number;
};

export type ProducerDiscount = TrackDiscount & { trackTitle: string };

export type MarketplaceLicense = {
  description?: string;
  conditions?: LicenseConditions;
  termsHash?: string;
  id: string;
  title: string;
  price: string;
  /** Base price before a track-specific promotion. Studio licenses keep their base price. */
  originalPrice?: string;
  discount?: TrackDiscount | null;
  currency: string;
  licenseType: "NON_EXCLUSIVE" | "EXCLUSIVE" | "CUSTOM";
  formats: string[];
  streamingLimit: number | null;
  distributionLimit: number | null;
  customTerms: string;
  version: number;
};

export type StudioLicense = MarketplaceLicense & {
  trackIds: string[];
  isActive: boolean;
};

export type MarketplaceTrack = {
  moodIds?: string[];
  instrumentIds?: string[];
  moods?: { id: string; name: string; slug: string }[];
  instruments?: { id: string; name: string; slug: string }[];
  version?: number;
  id: string;
  title: string;
  slug: string;
  description: string;
  producerId: string;
  producerName: string;
  producerAvatarUrl?: string | null;
  artworkUrl: string | null;
  previewUrl: string | null;
  previewStartSeconds: number;
  deliveryReady?: { wav: boolean; mp3: boolean; stems: boolean };
  previewDurationSeconds: number;
  durationSeconds: number;
  bpm: number;
  musicalKey: string;
  genre: { id: string; name: string } | null;
  tags: string[];
  explicit: boolean;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  visibility: "PUBLIC" | "PRIVATE";
  licenses: MarketplaceLicense[];
  /** True when any active license across the full set supports online WAV checkout. */
  hasPurchasableLicense?: boolean;
  hasMoreLicenses?: boolean;
  discount?: TrackDiscount | null;
};

export type TaxonomyKind = "genres" | "moods" | "instruments";
export type TaxonomyItem = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  description?: string;
  sortOrder?: number;
  version?: number;
  thumbnailUrl?: string | null;
  bannerUrl?: string | null;
  family?: string;
  color?: string | null;
};
