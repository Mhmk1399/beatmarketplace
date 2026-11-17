"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRightIcon, ChevronDownIcon, DiscIcon, MusicNoteIcon } from "@/components/ui/icons";
import { TrackCard } from "@/components/marketplace/TrackCard";
import { NeumorphicButton, NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { useMarketplace } from "@/components/marketplace/MarketplaceProvider";
import { discountNow, synchronizeDiscountClock, useDiscountWindowSignature } from "@/components/discounts/clock";
import { discountIsActive } from "@/lib/marketplace/discounts";
import type { MarketplaceTrack, TaxonomyItem } from "@/lib/marketplace/types";

const control = "neo-inset min-h-12 w-full rounded-[var(--radius-control)] px-4 text-sm text-[var(--text)]";
const initialFilters = { q: "", genreId: "", minBpm: "", maxBpm: "", key: "", sort: "newest" };
const pageSize = 24;

export function Catalog({ compact = false, saved = false, discounted = false }: { compact?: boolean; saved?: boolean; discounted?: boolean }) {
  const { favoriteIds } = useMarketplace();
  const favoritesVersion = saved ? Array.from(favoriteIds).sort().join(",") : "";
  const [tracks, setTracks] = useState<MarketplaceTrack[]>([]);
  const [genres, setGenres] = useState<TaxonomyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState([""]);
  const [retry, setRetry] = useState(0);
  const [filters, setFilters] = useState(initialFilters);
  const cursorMode = !saved && filters.sort === "newest";
  const cursor = cursorHistory[page - 1] ?? "";
  const activeWindows = useDiscountWindowSignature(tracks.map((track) => track.discount));
  const visibleTracks = discounted && activeWindows !== "" ? tracks.filter((track) => discountIsActive(track.discount, discountNow())) : tracks;

  useEffect(() => {
    if (compact || saved) return;
    const controller = new AbortController();
    fetch("/api/taxonomy?kind=genres", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : { items: [] })
      .then((data: { items: TaxonomyItem[] }) => setGenres(data.items)).catch(() => undefined);
    return () => controller.abort();
  }, [compact, saved]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ pageSize: compact ? "4" : String(pageSize) });
    if (cursorMode) { params.set("pagination", "cursor"); if (cursor) params.set("cursor", cursor); }
    else params.set("page", String(page));
    if (discounted) params.set("discounted", "1");
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    fetch(saved ? "/api/favorites" : `/api/tracks?${params}`, { signal: controller.signal, cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load beats.");
      if (controller.signal.aborted) return;
      synchronizeDiscountClock(data.serverTime ?? response.headers.get("date"));
      setTracks(data.tracks);
      setTotal(typeof data.total === "number" ? data.total : null);
      setNextCursor(data.nextCursor ?? null);
      setHasMore(data.hasMore ?? (typeof data.total === "number" && page * pageSize < data.total));
      setError("");
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not load beats.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [compact, saved, discounted, cursorMode, cursor, filters, page, retry, favoritesVersion]);

  function filter(name: keyof typeof filters, value: string) {
    setLoading(true); setPage(1); setCursorHistory([""]); setNextCursor(null);
    setFilters((current) => ({ ...current, [name]: value }));
  }
  function search(event: FormEvent) { event.preventDefault(); filter("q", query); }
  function refresh() { setLoading(true); setPage(1); setCursorHistory([""]); setRetry((value) => value + 1); }
  function nextPage() {
    if (cursorMode && nextCursor) setCursorHistory((history) => [...history.slice(0, page), nextCursor]);
    setLoading(true); setPage((value) => value + 1);
  }

  const filtered = Boolean(filters.q || filters.genreId || filters.key || filters.minBpm || filters.maxBpm);
  function clearFilters() {
    setLoading(true); setPage(1); setCursorHistory([""]); setNextCursor(null); setQuery(""); setFilters(initialFilters);
  }
  return (
    <div className="music-catalog space-y-8">
      {compact && <header className="music-section-heading">
        <div><p className="music-eyebrow"><DiscIcon className="size-4" /> The marketplace</p><h2>Fresh from the studio.</h2><p>Independent sounds. A new place to start.</p></div>
        <div className="flex flex-wrap gap-3"><NeumorphicLink href="/discounts" variant="quiet">Live offers</NeumorphicLink><NeumorphicLink href="/marketplace">All beats <ArrowRightIcon className="size-4" /></NeumorphicLink></div>
      </header>}
      {!compact && !saved && <section className="music-catalog-controls" aria-label="Find your sound">
        <form onSubmit={search} className="music-search-form">
          <div className="music-search-field">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" strokeLinecap="round" /></svg>
            <label className="sr-only" htmlFor="beat-search">Search beats, producers or tags</label>
            <input id="beat-search" type="search" maxLength={160} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="A sound, a producer, a feeling…" />
          </div>
          <NeumorphicButton type="submit" variant="accent" className="whitespace-nowrap">Find my sound <ArrowRightIcon className="size-4" /></NeumorphicButton>
        </form>
        {genres.length > 0 && <div className="music-genre-rail" aria-label="Browse by genre">
          <button type="button" className="music-genre-chip" aria-pressed={!filters.genreId} onClick={() => filter("genreId", "")}>All sounds</button>
          {genres.slice(0, 6).map((genre) => <button type="button" key={genre.id} className="music-genre-chip" aria-pressed={filters.genreId === genre.id} onClick={() => filter("genreId", genre.id)}>{genre.name}</button>)}
        </div>}
        <div className="music-filter-heading"><span className="music-eyebrow">Fine-tune your search</span><button type="button" aria-expanded={showFilters} aria-controls="beat-filters" className="music-filter-toggle" onClick={() => setShowFilters((value) => !value)}>{showFilters ? "Hide filters" : "Show filters"}<ChevronDownIcon className="size-4" /></button>{filtered && <button type="button" className="music-clear-filters" onClick={clearFilters}>Clear all</button>}</div>
        <div id="beat-filters" className="music-filter-grid" data-expanded={showFilters}>
          <label>Genre<select className={control} value={filters.genreId} onChange={(event) => filter("genreId", event.target.value)}><option value="">All genres</option>{genres.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}</select></label>
          <label>Minimum BPM<input className={control} type="number" min={20} max={400} placeholder="20" value={filters.minBpm} onChange={(event) => filter("minBpm", event.target.value)} /></label>
          <label>Maximum BPM<input className={control} type="number" min={20} max={400} placeholder="400" value={filters.maxBpm} onChange={(event) => filter("maxBpm", event.target.value)} /></label>
          <label>Musical key<input className={control} maxLength={20} placeholder="e.g. C minor" value={filters.key} onChange={(event) => filter("key", event.target.value)} /></label>
          <label className="music-sort-filter">Sort by<select className={control} value={filters.sort} onChange={(event) => filter("sort", event.target.value)}><option value="newest">Newest first</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></label>
        </div>
        {discounted && <p className="discount-catalog-note mt-4">Only active producer offers. Each price returns to its original amount when the timer ends.</p>}
      </section>}

      <div aria-busy={loading}>
        {loading ? <div className="music-track-grid">{[0,1,2,3].map((index) => <div key={index} className="music-track-skeleton animate-pulse" aria-label="Loading beat"><div /><span /><span /></div>)}</div>
          : error ? <div role="alert" className="music-catalog-empty"><DiscIcon className="size-9 text-accent-text" /><p className="text-error-text">{error}</p><NeumorphicButton onClick={refresh}>Try again</NeumorphicButton></div>
          : !visibleTracks.length ? <div className="music-catalog-empty"><span className="music-empty-icon"><MusicNoteIcon className="size-8" /></span><h3>{saved ? "Your next favorite is waiting." : discounted ? "The next good offer is on its way." : filtered ? "Let's find a different sound." : "The studio is warming up."}</h3><p>{saved ? "Save a beat with the heart button and find it here whenever you need it." : filtered ? "Try a different search or clear your filters to hear what's out there." : discounted ? "There are no live offers on this page right now. Explore the full catalog or check for new offers." : "Original music starts with independent producers. Upload your first beat from Producer Studio."}</p><div className="flex flex-wrap justify-center gap-3">{filtered ? <NeumorphicButton onClick={clearFilters}>Clear filters</NeumorphicButton> : <NeumorphicLink href={saved || discounted ? "/marketplace" : "/dashboard"}>{saved || discounted ? "Explore all beats" : "Open your workspace"}<ArrowRightIcon className="size-4" /></NeumorphicLink>}{discounted && <NeumorphicButton onClick={refresh}>Refresh offers</NeumorphicButton>}</div></div>
          : <><div className="music-catalog-results"><p><span className="music-status-dot" />{discounted ? `${visibleTracks.length} live ${visibleTracks.length === 1 ? "offer" : "offers"} on this page` : total === null ? `${visibleTracks.length} beats on this page` : `${total} ${total === 1 ? "beat" : "beats"}`}</p><span><MusicNoteIcon className="size-3.5" /> Producer-selected 30s previews</span></div><div className="music-track-grid">{visibleTracks.map((track) => <TrackCard key={track.id} track={track} queue={visibleTracks} />)}</div></>}
      </div>
      {!compact && !saved && (page > 1 || hasMore) && <nav aria-label="Catalog pages" className="music-pagination"><NeumorphicButton disabled={page === 1 || loading} onClick={() => { setLoading(true); setPage((value) => value - 1); }}>Previous</NeumorphicButton><span>Page {page}{total !== null && ` / ${Math.max(1, Math.ceil(total / pageSize))}`}</span><NeumorphicButton disabled={!hasMore || loading} onClick={nextPage}>Next <ArrowRightIcon className="size-4" /></NeumorphicButton></nav>}
    </div>
  );
}
