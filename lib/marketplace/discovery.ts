import type { MarketplaceTrack, TaxonomyItem, TaxonomyKind } from "./types";

export type DiscoveryKind = Exclude<TaxonomyKind, "genres">;
export const discoveryLabels = {
  moods: { singular: "Mood", plural: "Moods", heading: "Find your feeling.", description: "Follow the feeling. Explore original beats by mood and find the sound for your next idea." },
  instruments: { singular: "Instrument", plural: "Instruments", heading: "Start with a sound.", description: "From warm keys to deep bass. Discover original beats built around the instruments you love." },
} as const;
export type TaxonomyListPage = { items: TaxonomyItem[]; hasMore: boolean; nextCursor: string | null };
export type DiscoveryBeatPage = { tracks: MarketplaceTrack[]; hasMore: boolean; nextCursor: string | null; serverTime: string };
export function discoveryHref(kind: DiscoveryKind, slug: string) { return `/${kind}/${encodeURIComponent(slug)}`; }
