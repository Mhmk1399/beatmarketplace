"use client";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { BrowseBeatCard } from "@/components/marketplace/BrowseBeatCard";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { FrequencyLoader } from "@/components/ui/dynamic/GlobalLoading";
import { apiRequest, RequestError } from "@/components/studio/shared";
import { marketplaceAudioTrack } from "@/lib/audio/marketplace-track";
import { synchronizeDiscountClock } from "@/components/discounts/clock";
import type { MarketplaceTrack } from "@/lib/marketplace/types";
import styles from "./producers.module.css";
export type ProducerCatalogPage = { tracks: MarketplaceTrack[]; nextCursor: string | null; hasMore: boolean; serverTime: string };
export function ProducerBeatGrid({ tracks }: { tracks: MarketplaceTrack[] }) {
  const queue = tracks.map(marketplaceAudioTrack);
  return <div className={styles.beatGrid}>{tracks.map(beat => <BrowseBeatCard key={beat.id} beat={beat} queue={queue} />)}</div>;
}
export function ProducerCatalog({ producerId, name, initial }: { producerId: string; name: string; initial: ProducerCatalogPage }) {
  const [search, setSearch] = useState(""), [query, setQuery] = useState(""), [cursors, setCursors] = useState([""]), [page, setPage] = useState(0);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search.trim()); setCursors([""]); setPage(0); }, 300); return () => clearTimeout(timer); }, [search]);
  const initialUrl = `/api/producers/${producerId}/beats?limit=12&q=`;
  const url = `${initialUrl}${encodeURIComponent(query)}${cursors[page] ? `&cursor=${encodeURIComponent(cursors[page])}` : ""}`;
  const { data, error, isLoading, mutate } = useSWR<ProducerCatalogPage>(url, apiRequest, { fallback: { [initialUrl]: initial }, revalidateIfStale: false, revalidateOnFocus: false, dedupingInterval: 30000 });
  useEffect(() => { if (data?.serverTime) synchronizeDiscountClock(data.serverTime); }, [data?.serverTime]);
  return <section id="producer-catalog" className={styles.catalog} aria-labelledby="producer-catalog-title">
    <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>THE CATALOG</span><h2 id="producer-catalog-title">Made by {name}.</h2></div><label className={styles.search}><span className="sr-only">Search this producer’s beats</span><input type="search" placeholder="Find a sound in this studio…" maxLength={160} value={search} onChange={event => setSearch(event.target.value)} /></label></div>
    {error && <RequestError message={error instanceof Error ? error.message : "Could not load beats."} retry={() => { void mutate(); }} />}
    {isLoading ? <FrequencyLoader overlay={false} label="Loading this studio’s sound…" /> : <ProducerBeatGrid tracks={data?.tracks || []} />}
    {!isLoading && !error && !data?.tracks.length && <div className={styles.empty}><h3>{query ? "No beats match that search." : "The next sound is on its way."}</h3><p>{query ? "Try another title." : "This producer has not published a public beat yet."}</p>{query && <NeumorphicButton onClick={() => setSearch("")}>Clear search</NeumorphicButton>}</div>}
    {(page > 0 || data?.hasMore) && <nav className={styles.pagination} aria-label="Producer beat pages"><NeumorphicButton disabled={!page || isLoading} onClick={() => setPage(value => value - 1)}>Previous</NeumorphicButton><span>Page {page + 1}</span><NeumorphicButton disabled={!data?.nextCursor || isLoading} onClick={() => { if (data?.nextCursor) { setCursors(current => [...current.slice(0, page + 1), data.nextCursor!]); setPage(value => value + 1); } }}>Next</NeumorphicButton></nav>}
  </section>;
}
