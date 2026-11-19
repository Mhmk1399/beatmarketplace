import type { TaxonomyItem } from "./types";

/** Editorial fallbacks while no categories have been configured. */
export const genreStyles = [
  { slug: "trap", name: "Trap", description: "808s & dark energy" },
  { slug: "hip-hop", name: "Hip Hop", description: "Rhythm & soul" },
  { slug: "drill", name: "Drill", description: "Hard-hitting rhythms" },
  { slug: "rnb", name: "R&B", description: "Late-night melodies" },
  { slug: "afro", name: "Afro", description: "Warm, moving grooves" },
  { slug: "pop", name: "Pop", description: "Hooks that stay" },
  { slug: "lo-fi", name: "Lo-Fi", description: "Slow down & drift" },
  { slug: "edm", name: "EDM", description: "Built for the floor" },
] as const;

export function genreName(slug: string) {
  return genreStyles.find((style) => style.slug === slug)?.name ?? slug.replaceAll("-", " ");
}

export function genreAliases(slug: string) {
  const aliases: Record<string, string[]> = {
    "hip-hop": ["hip-hop", "hiphop"],
    rnb: ["rnb", "r-b", "r-and-b"],
    "lo-fi": ["lo-fi", "lofi"],
    afro: ["afro", "afrobeat", "afrobeats"],
  };
  return aliases[slug] ?? [slug];
}

export type GenreStyle = { id?: string; slug: string; name: string; description: string; art: string; thumbnailUrl?: string | null; bannerUrl?: string | null };

export function getGenreStyles(items: TaxonomyItem[]): GenreStyle[] {
  if (!items.length) return genreStyles.map(style => ({ ...style, art: style.slug, thumbnailUrl: null, bannerUrl: null }));
  return items.filter(item => item.isActive).map(item => {
    const fallback = genreStyles.find(style => genreAliases(style.slug).includes(item.slug));
    return { id: item.id, slug: item.slug, name: item.name, description: item.description || fallback?.description || "Original sounds. Independent producers.", art: fallback?.slug ?? "edm", thumbnailUrl: item.thumbnailUrl ?? null, bannerUrl: item.bannerUrl ?? null };
  });
}
