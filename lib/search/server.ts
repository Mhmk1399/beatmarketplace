import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import TrackModel from "@/models/Track";
import UserModel from "@/models/User";
import PopularSearchModel from "@/models/PopularSearch";
import { categoryImageUrl, getTaxonomyModel } from "@/lib/marketplace/taxonomy";
import { normalizeSearch, relevance, searchGrams, searchTerms, type SearchIndex } from "./matching";
import type { SearchBeat, SearchCategory, SearchDiscovery, SearchKind, SearchResponse } from "./types";
import { WorkspaceError } from "@/lib/workspace/server";

type Cached = { expires: number; pending: Promise<unknown> };
const state = globalThis as typeof globalThis & { beatSearchCache?: Map<string, Cached>; activeCatalogSearches?: number };
const cache = state.beatSearchCache ??= new Map();
export function invalidatePopularSearches() { cache.delete("popular"); }
async function memo<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const found = cache.get(key);
  if (found && found.expires > Date.now()) return found.pending as Promise<T>;
  if (cache.size >= 128) cache.delete(cache.keys().next().value!);
  const pending = load(); cache.set(key, { expires: Date.now() + ttl, pending });
  try { return await pending; } catch (error) { if (cache.get(key)?.pending === pending) cache.delete(key); throw error; }
}
export async function searchTaxonomy(): Promise<SearchCategory[]> {
  return memo("taxonomy", 60000, async () => {
    await connectToDatabase();
    const groups = await Promise.all((["genres", "moods", "instruments"] as const).map(async kind => {
      const model = getTaxonomyModel(kind);
      const records = await model.find({ isActive: true }).select("name slug description thumbnail aliases").sort({ sortOrder: 1, name: 1 }).limit(1000).maxTimeMS(3000).lean();
      return records.map(row => ({ id: String(row._id), name: row.name, slug: row.slug, description: row.description || "", kind: kind as SearchKind, href: kind === "genres" ? `/marketplace?genre=${encodeURIComponent(row.slug)}` : `/${kind}/${encodeURIComponent(row.slug)}`, image: categoryImageUrl(String(row._id), "thumbnail", row.thumbnail, kind), aliases: "aliases" in row && Array.isArray(row.aliases) ? row.aliases as string[] : [] }));
    }));
    return groups.flat();
  });
}
export async function searchDiscovery(): Promise<SearchDiscovery> {
  const [items, popular] = await Promise.all([searchTaxonomy(), memo("popular", 30000, async () => {
    await connectToDatabase();
    const records = await PopularSearchModel.find({ count: { $gt: 0 } }).select("term").sort({ count: -1, lastSearchedAt: -1 }).limit(8).maxTimeMS(2000).lean() as { term: string }[];
    return records.map(row => row.term);
  })]);
  return { popular, genres: items.filter(item => item.kind === "genres"), moods: items.filter(item => item.kind === "moods"), instruments: items.filter(item => item.kind === "instruments") };
}
type Source = { _id: mongoose.Types.ObjectId; title: string; description?: string; search?: SearchIndex; metadata: { tags: string[]; genreId?: mongoose.Types.ObjectId; moodIds?: mongoose.Types.ObjectId[]; instrumentIds?: mongoose.Types.ObjectId[] } };
type Candidate = { ids: string[]; corrected: string | null; taxonomy: SearchCategory[]; trendTerm: string | null };
const projection = "title description search metadata.tags metadata.genreId metadata.moodIds metadata.instrumentIds";
async function candidates(query: string): Promise<Candidate> {
  return memo("query:" + searchTerms(query).join(" "), 20000, async () => {
    if ((state.activeCatalogSearches || 0) >= 8) throw new WorkspaceError("Search is busy. Try again in a moment.", 429, 2);
    state.activeCatalogSearches = (state.activeCatalogSearches || 0) + 1;
    try {
    const taxonomy = await searchTaxonomy();
    const scored = taxonomy.map(item => ({ item, score: relevance(query, item.name, [item.slug, ...(item.aliases || [])]) })).filter(hit => hit.score >= .65).sort((a, b) => b.score - a.score || searchTerms(a.item.name).length - searchTerms(b.item.name).length || a.item.name.localeCompare(b.item.name, "en"));
    const strong = scored.filter(hit => hit.score >= .72), terms = searchTerms(query);
    const alternatives: Record<string, unknown>[] = [{ $and: terms.map(term => ({ "search.tokens": term.length < 2 ? term : { $regex: "^" + term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") } })) }];
    for (const [kind, field] of [["genres", "metadata.genreId"], ["moods", "metadata.moodIds"], ["instruments", "metadata.instrumentIds"]] as const) {
      const ids = strong.filter(hit => hit.item.kind === kind).slice(0, 8).map(hit => new mongoose.Types.ObjectId(hit.item.id));
      if (ids.length) alternatives.push({ [field]: { $in: ids } });
    }
    const match = { status: "PUBLISHED", visibility: "PUBLIC" } as const;
    const exact = await TrackModel.find({ ...match, $or: alternatives }).select(projection).limit(160).maxTimeMS(3000).lean() as unknown as Source[];
    const grams = searchGrams(terms.join(" "));
    const fuzzy = exact.length < 24 && grams.length ? await TrackModel.find({ ...match, "search.grams": { $in: grams }, _id: { $nin: exact.map(row => row._id) } }).select(projection).limit(120).maxTimeMS(3000).lean() as unknown as Source[] : [];
    const ranked = [...exact, ...fuzzy].map(row => {
      const direct = relevance(query, row.title, row.search?.tokens || row.metadata.tags || []);
      const ids = new Set([String(row.metadata.genreId || ""), ...(row.metadata.moodIds || []).map(String), ...(row.metadata.instrumentIds || []).map(String)]);
      const semantic = strong.find(hit => ids.has(hit.item.id))?.score || 0;
      return { id: String(row._id), score: Math.max(direct, semantic * .92), direct };
    }).filter(row => row.score >= .6).sort((a, b) => b.score - a.score);
    const best = scored[0];
    const corrected = best && normalizeSearch(best.item.name) !== normalizeSearch(query) && best.score < 1 ? best.item.name : null;
    // Popular suggestions come from catalog matches, never arbitrary personal strings.
    const safe = !/[@/:]|\d{6,}/.test(query) && terms.length <= 6;
    const trendTerm = safe ? strong[0]?.item.name || (ranked[0]?.direct >= .8 ? normalizeSearch(query) : null) : null;
    return { ids: ranked.map(row => row.id), corrected, taxonomy: scored.map(hit => hit.item), trendTerm };
    } finally { state.activeCatalogSearches = Math.max(0, (state.activeCatalogSearches || 1) - 1); }
  });
}
export async function searchCatalog(query: string, page = 1, suggest = false): Promise<SearchResponse> {
  if (normalizeSearch(query).length < 2) throw new WorkspaceError("Enter at least two letters or numbers.", 400);
  await connectToDatabase();
  const result = await candidates(query), size = suggest ? 4 : 12;
  const ids = result.ids.slice((page - 1) * size, page * size).map(id => new mongoose.Types.ObjectId(id));
  // Recheck current visibility and producer status even when candidate IDs are cached.
  const records = ids.length ? await TrackModel.aggregate<{ _id: mongoose.Types.ObjectId; title: string; description: string; artwork?: { publicUrl?: string }; metadata: { bpm: number; musicalKey: string } }>([
    { $match: { _id: { $in: ids }, status: "PUBLISHED", visibility: "PUBLIC" } },
    { $lookup: { from: UserModel.collection.name, localField: "producerId", foreignField: "_id", pipeline: [{ $match: { status: "ACTIVE", roles: "PRODUCER" } }, { $project: { _id: 1 } }], as: "__producer" } },
    { $match: { "__producer.0": { $exists: true } } },
    { $project: { title: 1, description: 1, "artwork.publicUrl": 1, "metadata.bpm": 1, "metadata.musicalKey": 1 } },
  ]).option({ maxTimeMS: 3000 }) : [];
  const mapped = new Map(records.map(row => [String(row._id), { id: String(row._id), title: row.title, description: row.description?.slice(0, 180) || "", href: `/tracks/${row._id}`, image: row.artwork?.publicUrl || null, bpm: row.metadata.bpm, musicalKey: row.metadata.musicalKey } satisfies SearchBeat]));
  const group = (kind: SearchKind) => result.taxonomy.filter(item => item.kind === kind).slice(0, suggest ? 4 : 24);
  return { query, corrected: result.corrected, beats: ids.flatMap(id => mapped.get(String(id)) || []), genres: group("genres"), moods: group("moods"), instruments: group("instruments"), page, hasMore: !suggest && result.ids.length > page * size, trendTerm: result.trendTerm };
}
