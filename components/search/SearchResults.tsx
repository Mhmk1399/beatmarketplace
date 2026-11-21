"use client";
import { useEffect } from "react";
import useSWR from "swr";
import { useAuth } from "@/components/auth/AuthProvider";
import { FrequencyLoader } from "@/components/ui/dynamic/GlobalLoading";
import { NeumorphicButton, NeumorphicLink } from "@/components/ui/neumorphic/Button";
import type { SearchResponse } from "@/lib/search/types";
import { normalizeSearch } from "@/lib/search/matching";
import { BeatResult, CategoryResult, searchLabels } from "./SearchItems";
import { rememberSearch } from "./history";
import { searchFetcher } from "./fetcher";
import styles from "./search.module.css";
export function SearchResults({ query, page }: { query: string; page: number }) {
  const { user, status } = useAuth(), valid = normalizeSearch(query).length >= 2;
  const result = useSWR<SearchResponse>(valid ? `/api/search?q=${encodeURIComponent(query)}&page=${page}` : null, searchFetcher, { revalidateOnFocus: false, dedupingInterval: 20000, errorRetryCount: 1 });
  const data = result.data;
  useEffect(() => {
    if (!data || page !== 1 || status === "loading") return;
    rememberSearch(user?.id || "guest", query);
    if (!data.trendTerm) return;
    const key = "beatmarketplace-search-count:" + normalizeSearch(data.trendTerm);
    try { if (Date.now() - Number(sessionStorage.getItem(key) || 0) < 86400000) return; sessionStorage.setItem(key, String(Date.now())); } catch { /* Server receipts also deduplicate blocked-storage browsers. */ }
    void fetch("/api/search/popular", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: query }) }).then(response => { if (!response.ok) { try { sessionStorage.removeItem(key); } catch { /* Noncritical analytics. */ } } }).catch(() => { try { sessionStorage.removeItem(key); } catch { /* Search results stay available. */ } });
  }, [data, page, query, user?.id, status]);
  const openSearch = () => window.dispatchEvent(new CustomEvent("beatmarketplace:search", { detail: query }));
  return <main className={styles.results}>
    <header className={styles.resultsHeader}><p className="music-eyebrow">FIND YOUR NEXT SOUND</p><h1>{query ? <>Results for <span>“{query}”</span></> : <>Explore by <span>sound.</span></>}</h1><p>Beats, categories, moods and instruments, each in its own space.</p><NeumorphicButton onClick={openSearch}>{query ? "Edit search" : "Start a search"}</NeumorphicButton></header>
    {!valid ? <p className={styles.empty}>Search with at least two letters or numbers, or browse a category from the search box.</p> : result.isLoading ? <FrequencyLoader overlay={false} label="Finding the closest matches…" /> : result.error ? <div className={styles.empty}><h2>Search could not load.</h2><p>Your query is still here. Try again in a moment.</p><NeumorphicButton onClick={() => void result.mutate()}>Try again</NeumorphicButton></div> : data && <>
      {data.corrected && <p className={styles.correction}>Including results close to <NeumorphicLink href={`/search?q=${encodeURIComponent(data.corrected)}`} size="sm">{data.corrected}</NeumorphicLink></p>}
      <section aria-labelledby="search-beats-title"><div className={styles.sectionTop}><h2 id="search-beats-title">Beats <small>{data.beats.length} on this page</small></h2></div>{data.beats.length ? <div className={styles.beatGrid}>{data.beats.map(item => <BeatResult key={item.id} item={item} />)}</div> : <p className={styles.empty}>No close beat matches. Explore the matching categories, moods or instruments below.</p>}</section>
      {(["genres", "moods", "instruments"] as const).map(kind => <section key={kind} aria-labelledby={`search-${kind}-title`}><div className={styles.sectionTop}><h2 id={`search-${kind}-title`}>{searchLabels[kind]} <small>{data[kind].length} matches</small></h2></div>{data[kind].length ? <div className={styles.categoryGrid}>{data[kind].map(item => <CategoryResult key={item.id} item={item} />)}</div> : <p className={styles.hint}>No matching {searchLabels[kind].toLowerCase()}.</p>}</section>)}
      {(page > 1 || data.hasMore) && <nav className={styles.pagination} aria-label="Beat search pages">{page > 1 ? <NeumorphicLink href={`/search?q=${encodeURIComponent(query)}&page=${page - 1}`}>Previous</NeumorphicLink> : <span />}<span>Page {page}</span>{data.hasMore ? <NeumorphicLink href={`/search?q=${encodeURIComponent(query)}&page=${page + 1}`}>More beats</NeumorphicLink> : <span />}</nav>}
    </>}
  </main>;
}
