import { normalizeMusicalKey } from "@/lib/music/keys";

export type BrowseFilters = {
  q: string; genre: string; minBpm: string; maxBpm: string; key: string; moodId: string;
  sort: "newest" | "price-asc" | "price-desc";
};

export const emptyBrowseFilters: BrowseFilters = { q: "", genre: "", minBpm: "", maxBpm: "", key: "", moodId: "", sort: "newest" };

/** Canonical, bounded URL state shared by the server entry and browser controls. */
export function readBrowseFilters(params: URLSearchParams): BrowseFilters {
  const bpm = (name: string) => { const value = params.get(name) ?? ""; return /^\d{2,3}$/.test(value) && Number(value) >= 20 && Number(value) <= 400 ? String(Number(value)) : ""; };
  const genre = params.get("genre") ?? "";
  const moodId = params.get("moodId") ?? "";
  const sort = params.get("sort");
  const result: BrowseFilters = {
    q: (params.get("q") ?? "").trim().slice(0, 160),
    genre: genre.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(genre) ? genre : "",
    minBpm: bpm("minBpm"), maxBpm: bpm("maxBpm"),
    key: normalizeMusicalKey((params.get("key") ?? "").slice(0, 20)) ?? "",
    moodId: /^[a-f\d]{24}$/i.test(moodId) ? moodId.toLowerCase() : "",
    sort: sort === "price-asc" || sort === "price-desc" ? sort : "newest",
  };
  if (result.minBpm && result.maxBpm && Number(result.minBpm) > Number(result.maxBpm)) { result.minBpm = ""; result.maxBpm = ""; }
  return result;
}

export function browseParams(filters: BrowseFilters) {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(filters)) {
    const normalized = name === "q" ? value.trim() : value;
    if (normalized && !(name === "sort" && normalized === "newest")) params.set(name, normalized);
  }
  params.sort();
  return params;
}

export function browseHref(filters: BrowseFilters) {
  const query = browseParams(filters).toString();
  return `/marketplace${query ? `?${query}` : ""}`;
}
