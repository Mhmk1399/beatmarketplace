export type SearchKind = "genres" | "moods" | "instruments";
export type SearchCategory = { id: string; name: string; slug: string; description: string; kind: SearchKind; href: string; image: string | null; aliases?: string[] };
export type SearchBeat = { id: string; title: string; description: string; href: string; image: string | null; bpm: number; musicalKey: string };
export type SearchResponse = { query: string; corrected: string | null; beats: SearchBeat[]; genres: SearchCategory[]; moods: SearchCategory[]; instruments: SearchCategory[]; page: number; hasMore: boolean; trendTerm: string | null };
export type SearchDiscovery = { popular: string[]; genres: SearchCategory[]; moods: SearchCategory[]; instruments: SearchCategory[] };
