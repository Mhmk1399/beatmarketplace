"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { synchronizeDiscountClock } from "@/components/discounts/clock";
import { apiRequest, ApiRequestError } from "@/components/studio/shared";
import { browseCacheKey, type BrowseCacheKey } from "@/lib/marketplace/browse-cache";
import { browseHref, browseParams, readBrowseFilters, type BrowseFilters } from "@/lib/marketplace/browse";
import { genreAliases } from "@/lib/marketplace/genres";
import type { MarketplaceTrack, TaxonomyItem } from "@/lib/marketplace/types";

type CatalogPage = {
  tracks: MarketplaceTrack[];
  hasMore: boolean;
  nextCursor: string | null;
  serverTime?: string;
};

const noTracks: MarketplaceTrack[] = [];
const noTaxonomy: TaxonomyItem[] = [];
const cacheOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  keepPreviousData: false,
  errorRetryCount: 1,
  shouldRetryOnError: (error: ApiRequestError) => error.status >= 500,
};

async function fetchCatalog([, url]: BrowseCacheKey) {
  const data = await apiRequest<CatalogPage>(url, { quiet: true });
  if (!Array.isArray(data.tracks)) throw new ApiRequestError("Could not load beats. Please try again.", 502);
  return data;
}

async function fetchTaxonomy([, url]: BrowseCacheKey) {
  const data = await apiRequest<{ items: TaxonomyItem[] }>(url, { quiet: true });
  if (!Array.isArray(data.items)) throw new ApiRequestError("Could not load filter options. Please try again.", 502);
  return data.items;
}

export function usePublicCatalogPage(url: string | null) {
  return useSWR<CatalogPage, ApiRequestError>(
    url ? browseCacheKey(url) : null,
    fetchCatalog,
    { ...cacheOptions, dedupingInterval: 30_000, onSuccess: result => synchronizeDiscountClock(result.serverTime) },
  );
}

export function useBrowseCatalog(initialFilters: BrowseFilters) {
  const [selection, setSelection] = useState({ filters: initialFilters, page: 1, cursors: [""] });
  const { filters, page, cursors } = selection;
  const query = filters.q.trim();
  const [settledQuery, setSettledQuery] = useState(query);
  const searchPending = query !== settledQuery;
  const cursorMode = filters.sort === "newest";
  const cursor = cursors[page - 1];

  useEffect(() => {
    if (!searchPending) return;
    const timer = setTimeout(() => setSettledQuery(query), 220);
    return () => clearTimeout(timer);
  }, [query, searchPending]);

  const params = browseParams(filters);
  if (filters.genre) params.set("genre", genreAliases(filters.genre)[0]);
  params.set("pageSize", "32");
  if (cursorMode) {
    params.set("pagination", "cursor");
    if (cursor) params.set("cursor", cursor);
  } else {
    params.set("page", String(page));
  }

  const { data, error, isLoading, isValidating, mutate } = usePublicCatalogPage(searchPending ? null : `/api/tracks?${params}`);
  const genres = useSWR<TaxonomyItem[], ApiRequestError>(browseCacheKey("/api/taxonomy?kind=genres"), fetchTaxonomy, { ...cacheOptions, dedupingInterval: 60_000 });
  const moods = useSWR<TaxonomyItem[], ApiRequestError>(browseCacheKey("/api/taxonomy?kind=moods"), fetchTaxonomy, { ...cacheOptions, dedupingInterval: 60_000 });

  const commit = useCallback((next: BrowseFilters, history: "push" | "replace" | "none" = "push") => {
    const normalized = readBrowseFilters(browseParams(next));
    const href = browseHref(normalized);
    const rawQuery = next.q.slice(0, 160);
    const nextFilters = { ...normalized, q: rawQuery };

    setSelection(current => {
      if (browseHref(current.filters) !== href) return { filters: nextFilters, page: 1, cursors: [""] };
      return current.filters.q === rawQuery ? current : { ...current, filters: nextFilters };
    });
    if (history !== "replace") setSettledQuery(normalized.q);

    if (history === "none" || `${window.location.pathname}${window.location.search}` === href) return;
    if (history === "push") window.history.pushState(null, "", href);
    else window.history.replaceState(null, "", href);
  }, []);

  useEffect(() => {
    function pop() {
      if (window.location.pathname === "/marketplace") commit(readBrowseFilters(new URLSearchParams(window.location.search)), "none");
    }
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [commit]);

  const nextCursor = data?.nextCursor;
  const hasMore = !error && Boolean(data?.hasMore && (cursorMode ? nextCursor && nextCursor !== cursor : page < 1000));
  function refresh() { if (!isValidating) void mutate().catch(() => {}); }
  function submitSearch() {
    if (searchPending) setSettledQuery(query);
    else if (!data || error) refresh();
  }
  function retryTaxonomy() {
    if (genres.error && !genres.isValidating) void genres.mutate().catch(() => {});
    if (moods.error && !moods.isValidating) void moods.mutate().catch(() => {});
  }
  function next() {
    if (!hasMore || searchPending) return;
    const nextCursors = cursorMode && nextCursor ? [...cursors.slice(0, page), nextCursor] : cursors;
    setSelection(current => current === selection ? { ...current, page: page + 1, cursors: nextCursors } : current);
  }
  function previous() {
    if (page > 1) setSelection(current => current === selection ? { ...current, page: page - 1 } : current);
  }

  return {
    filters, commit, submitSearch, refresh, page, hasMore, next, previous,
    tracks: data?.tracks ?? noTracks,
    loading: searchPending || isLoading,
    error: error?.message,
    taxonomy: { genres: genres.data ?? noTaxonomy, moods: moods.data ?? noTaxonomy },
    taxonomyError: genres.error || moods.error,
    retryTaxonomy,
  };
}
