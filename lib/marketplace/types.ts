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
  id: string;
  title: string;
  slug: string;
  description: string;
  producerId: string;
  producerName: string;
  artworkUrl: string | null;
  previewUrl: string | null;
  previewStartSeconds: number;
  previewDurationSeconds: number;
  durationSeconds: number;
  bpm: number;
  musicalKey: string;
  genre: { id: string; name: string } | null;
  tags: string[];
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  visibility: "PUBLIC" | "PRIVATE";
  licenses: MarketplaceLicense[];
  hasMoreLicenses?: boolean;
  discount?: TrackDiscount | null;
};

export type TaxonomyKind = "genres" | "moods" | "instruments";
export type TaxonomyItem = { id: string; name: string; slug: string; isActive: boolean };
