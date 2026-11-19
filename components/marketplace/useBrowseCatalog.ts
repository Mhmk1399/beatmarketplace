"use client";

import { useCallback, useEffect, useState } from "react";
import { synchronizeDiscountClock } from "@/components/discounts/clock";
import { browseHref, browseParams, readBrowseFilters, type BrowseFilters } from "@/lib/marketplace/browse";
import type { MarketplaceTrack, TaxonomyItem } from "@/lib/marketplace/types";

export function useBrowseCatalog(initialFilters: BrowseFilters) {
  const [filters, setFilters] = useState(initialFilters);
  const [taxonomy, setTaxonomy] = useState<{ genres: TaxonomyItem[]; moods: TaxonomyItem[] }>({ genres: [], moods: [] });
  const [tracks, setTracks] = useState<MarketplaceTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [page, setPage] = useState(1);
  const [cursors, setCursors] = useState([""]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const cursorMode = filters.sort === "newest";
  const cursor = cursors[page - 1] ?? "";

  useEffect(() => {
    const controller = new AbortController();
    async function load(kind: "genres" | "moods") {
      try {
        const response = await fetch(`/api/taxonomy?kind=${kind}`, { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        if (!controller.signal.aborted && Array.isArray(data.items)) setTaxonomy((current) => ({ ...current, [kind]: data.items.slice(0, 500) }));
      } catch { /* Discovery and playback stay usable without taxonomy data. */ }
    }
    void Promise.all([load("genres"), load("moods")]);
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    const controller = new AbortController();
    const params = browseParams(filters);
    params.set("pageSize", "32");
    if (cursorMode) { params.set("pagination", "cursor"); if (cursor) params.set("cursor", cursor); }
    else params.set("page", String(page));
    const timer = setTimeout(() => { void fetch(`/api/tracks?${params}`, { signal: controller.signal, cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.tracks)) throw new Error(data.error || "Could not load beats. Please try again.");
      if (controller.signal.aborted) return;
      synchronizeDiscountClock(data.serverTime ?? response.headers.get("date"));
      setTracks(data.tracks); setNextCursor(data.nextCursor ?? null); setHasMore(Boolean(data.hasMore)); setError("");
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) { setTracks([]); setHasMore(false); setNextCursor(null); setError(failure instanceof Error ? failure.message : "Could not load beats."); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); }, 220);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filters, cursorMode, cursor, page, retry]);

  const commit = useCallback((next: BrowseFilters, writeHistory = true) => {
    setLoading(true); setError(""); setPage(1); setCursors([""]); setNextCursor(null); setFilters(next);
    if (writeHistory) window.history.replaceState(window.history.state, "", browseHref(next));
  }, []);
  useEffect(() => {
    const pop = () => commit(readBrowseFilters(new URLSearchParams(window.location.search)), false);
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [commit]);
  function refresh() { setLoading(true); setRetry((value) => value + 1); }
  function next() {
    if (!hasMore || (!cursorMode && page >= 1000)) return;
    if (cursorMode && nextCursor) setCursors((current) => [...current.slice(0, page), nextCursor]);
    setLoading(true); setPage((value) => value + 1);
  }
  function previous() { if (page > 1) { setLoading(true); setPage((value) => value - 1); } }
  return { filters, commit, taxonomy, tracks, loading, error, refresh, page, hasMore: hasMore && (cursorMode || page < 1000), next, previous };
}
