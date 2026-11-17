import type { MarketplaceTrack } from "@/lib/marketplace/types";

export type HeroPaymentStatus = "PENDING" | "PAID" | "COMPLIMENTARY";

export type HeroPlacementItem = {
  id: string;
  track: MarketplaceTrack;
  label: string;
  position: number;
  startsAt: string;
  endsAt: string;
  sponsored: true;
};
export type PublicHeroPlacement = HeroPlacementItem;
export type HeroResponse = { placements: HeroPlacementItem[]; serverTime: string };

export type AdminHeroPlacement = {
  id: string;
  trackId: string;
  trackTitle: string;
  producerName: string;
  artworkUrl: string | null;
  trackAvailable: boolean;
  position: number;
  label: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  agreedFeeToman: number;
  paymentStatus: HeroPaymentStatus;
  paymentReference: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};
export type AdminHeroResponse = {
  placements: AdminHeroPlacement[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  serverTime: string;
};
