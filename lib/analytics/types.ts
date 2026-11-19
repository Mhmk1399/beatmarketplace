export type BeatAnalytics = {
  id: string;
  title: string;
  artworkUrl: string | null;
  status: string;
  visibility: string;
  views: number;
  uniqueVisitors: number;
  lastViewedAt: string | null;
};
