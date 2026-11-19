export const PRODUCER_SOCIALS = ["instagram", "youtube", "soundcloud", "spotify", "tiktok", "twitter"] as const;
export type ProducerSocial = typeof PRODUCER_SOCIALS[number];
export type ProducerLayout = "IMMERSIVE" | "COMPACT";
export type BannerPosition = "top" | "center" | "bottom";
export type ProducerSummary = {
  id: string; href: string; username: string; stageName: string; storefrontName: string;
  tagline: string; bio: string; location: string; website: string;
  socialLinks: Partial<Record<ProducerSocial, string>>;
  avatarUrl: string | null; bannerUrl: string | null; bannerPosition: BannerPosition; layout: ProducerLayout;
  genres: { id: string; name: string; slug: string }[]; beatCount: number; memberSince: string;
};
export type ProducerDirectoryPage = { items: ProducerSummary[]; hasMore: boolean; nextCursor: string | null };
export type ProducerSettings = {
  producerId: string;
  stageName: string; storefrontName: string; tagline: string; bio: string; location: string; website: string;
  socialLinks: Record<ProducerSocial, string>; genreIds: string[]; featuredTrackIds: string[];
  layout: ProducerLayout; bannerPosition: BannerPosition; bannerUrl: string | null;
  avatarUrl: string | null; publicUrl: string; version: number;
};
