"use client";
import { useEffect, useState } from "react";
import useSWR from "swr";
import type { ProducerDirectoryPage } from "@/lib/producers/types";
import { ProducerCard } from "./ProducerIdentity";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { FrequencyLoader } from "@/components/ui/dynamic/GlobalLoading";
import { apiRequest, RequestError } from "@/components/studio/shared";
import { MusicNoteIcon, UsersIcon } from "@/components/ui/icons";
import styles from "./producers.module.css";
import { CreateCta } from "@/components/home/CreateCta";

export function ProducersDirectory({ initial, initialQuery = "" }: { initial: ProducerDirectoryPage; initialQuery?: string }) {
  const [search, setSearch] = useState(initialQuery), [query, setQuery] = useState(initialQuery), [cursors, setCursors] = useState([""]), [page, setPage] = useState(0);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search.trim()); setCursors([""]); setPage(0); }, 300); return () => clearTimeout(timer); }, [search]);
  const url = `/api/producers/directory?limit=12&q=${encodeURIComponent(query)}${cursors[page] ? `&cursor=${encodeURIComponent(cursors[page])}` : ""}`;
  const initialUrl = `/api/producers/directory?limit=12&q=${encodeURIComponent(initialQuery)}`;
  const { data, error, isLoading, mutate } = useSWR<ProducerDirectoryPage>(url, apiRequest, { fallback: { [initialUrl]: initial }, revalidateIfStale: false, revalidateOnFocus: false, dedupingInterval: 30000 });
  return <div className={styles.page}>
    <header className={styles.directoryHeader}><span className={styles.eyebrow}><UsersIcon />THE PEOPLE BEHIND THE SOUND</span><h1>Meet your next<br /><span>favorite producer.</span></h1><p>Independent studios. Original sounds. Find the people behind the beats you love.</p><CreateCta label="Build your studio" /><MusicNoteIcon className={styles.headerNote} /></header>
    <div className={styles.toolbar}><label className={styles.search}><span className="sr-only">Search producers</span><UsersIcon /><input type="search" placeholder="Search producers or studios…" maxLength={80} value={search} onChange={event => setSearch(event.target.value)} /></label><span>{query ? `Results for “${query}”` : "Discover independent creators"}</span></div>
    {error && <RequestError message={error instanceof Error ? error.message : "Could not load producers."} retry={() => { void mutate(); }} />}
    {isLoading ? <FrequencyLoader overlay={false} label="Finding your next favorite producer…" /> : <div className={styles.directoryGrid}>{data?.items.map(producer => <ProducerCard key={producer.id} producer={producer} />)}</div>}
    {!isLoading && !error && !data?.items.length && <div className={styles.empty}><UsersIcon /><h2>No studios found.</h2><p>Try another name or discover all producers.</p><NeumorphicButton onClick={() => setSearch("")}>Clear search</NeumorphicButton></div>}
    {(page > 0 || data?.hasMore) && <nav className={styles.pagination} aria-label="Producer pages"><NeumorphicButton disabled={!page || isLoading} onClick={() => setPage(value => value - 1)}>Previous</NeumorphicButton><span>Page {page + 1}</span><NeumorphicButton disabled={!data?.nextCursor || isLoading} onClick={() => { if (data?.nextCursor) { setCursors(current => [...current.slice(0, page + 1), data.nextCursor!]); setPage(value => value + 1); } }}>Next</NeumorphicButton></nav>}
  </div>;
}
