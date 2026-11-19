"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import useSWR from "swr";
import { BrowseBeatCard } from "@/components/marketplace/BrowseBeatCard";
import { NeumorphicButton, NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { FrequencyLoader } from "@/components/ui/dynamic/GlobalLoading";
import { ArrowRightIcon, MusicNoteIcon } from "@/components/ui/icons";
import { apiRequest, RequestError } from "@/components/studio/shared";
import { marketplaceAudioTrack } from "@/lib/audio/marketplace-track";
import { synchronizeDiscountClock } from "@/components/discounts/clock";
import { discoveryHref, discoveryLabels, type DiscoveryBeatPage, type DiscoveryKind, type TaxonomyListPage } from "@/lib/marketplace/discovery";
import type { TaxonomyItem } from "@/lib/marketplace/types";
import styles from "./discovery.module.css";

function usePage<T>(base: string, initial: T) {
  const [cursors, setCursors] = useState([""]), [page, setPage] = useState(0);
  const cursor = cursors[page];
  const url = `${base}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
  const result = useSWR<T>(url, key => apiRequest<T>(key, { quiet: true }), { fallback: { [base]: initial }, revalidateIfStale: false, revalidateOnFocus: false, dedupingInterval: 30000 });
  return { ...result, page, previous: () => setPage(value => Math.max(0, value - 1)), next: (cursor: string) => { setCursors(current => [...current.slice(0, page + 1), cursor]); setPage(value => value + 1); } };
}
function Pagination({ page, loading, hasMore, previous, next }: { page: number; loading: boolean; hasMore: boolean; previous: () => void; next: () => void }) {
  if (!page && !hasMore) return null;
  return <nav className={styles.pagination} aria-label="Result pages"><NeumorphicButton disabled={!page || loading} onClick={previous}>Previous</NeumorphicButton><span aria-live="polite">Page {page + 1}</span><NeumorphicButton disabled={!hasMore || loading} onClick={next}>Next</NeumorphicButton></nav>;
}
export function DiscoveryDirectory({ kind, initial }: { kind: DiscoveryKind; initial: TaxonomyListPage }) {
  const catalog = usePage(`/api/taxonomy?kind=${kind}&limit=24`, initial);
  const { data, error, isLoading } = catalog;
  return <section aria-label={`Browse ${kind}`} aria-busy={isLoading}>
    {error && <RequestError message={error instanceof Error ? error.message : "Could not load these sounds."} retry={() => { void catalog.mutate(); }} />}
    {!data && isLoading ? <FrequencyLoader overlay={false} label={`Loading ${kind}…`} /> : <div className={styles.directoryGrid}>{data?.items.map(item => <Link key={item.id} href={discoveryHref(kind, item.slug)} prefetch={false} className={styles.card} style={item.color && /^#[0-9a-f]{6}$/i.test(item.color) ? { "--discovery-tint": item.color } as CSSProperties : undefined}>
      {item.thumbnailUrl ? <Image src={item.thumbnailUrl} alt="" fill unoptimized sizes="(max-width:699px) 46vw, (max-width:1023px) 30vw, 320px" className={styles.cardImage} /> : <span className={styles.cardFallback} aria-hidden="true"><MusicNoteIcon /></span>}
      <span className={styles.cardCopy}><span>{kind === "moods" ? "SET THE MOOD" : item.family?.replaceAll("_", " ") || "IN THE SOUND"}</span><strong>{item.name}</strong><span>{item.description || `Explore ${item.name.toLowerCase()} beats.`}</span></span><span className={styles.cardArrow} aria-hidden="true"><ArrowRightIcon /></span>
    </Link>)}</div>}
    {!isLoading && !error && !data?.items.length && <div className={styles.empty}><MusicNoteIcon /><h2>A new way to find your sound.</h2><p>New {kind} will appear here as they are added to the catalog.</p><NeumorphicLink href="/marketplace" variant="accent">Explore all beats <ArrowRightIcon /></NeumorphicLink></div>}
    <Pagination page={catalog.page} loading={isLoading} hasMore={Boolean(data?.hasMore)} previous={catalog.previous} next={() => { if (data?.nextCursor) catalog.next(data.nextCursor); }} />
  </section>;
}
export function DiscoveryCatalog({ kind, item, initial }: { kind: DiscoveryKind; item: TaxonomyItem; initial: DiscoveryBeatPage }) {
  const catalog = usePage(`/api/taxonomy/${item.id}/tracks?kind=${kind}&limit=24`, initial);
  const { data, error, isLoading } = catalog;
  useEffect(() => { if (data?.serverTime) synchronizeDiscountClock(data.serverTime); }, [data?.serverTime]);
  const tracks = data?.tracks ?? [], queue = tracks.map(marketplaceAudioTrack);
  return <section id="discovery-beats" className={styles.catalog} aria-labelledby="discovery-catalog-title" aria-busy={isLoading}>
    <header className={styles.catalogHeading}><div><p className={styles.eyebrow}>{kind === "moods" ? "SOUNDS LIKE YOUR FEELING" : "BUILT AROUND THIS SOUND"}</p><h2 id="discovery-catalog-title">{item.name} beats.</h2></div><NeumorphicLink href={`/${kind}`} variant="quiet">All {discoveryLabels[kind].plural.toLowerCase()} <ArrowRightIcon /></NeumorphicLink></header>
    {error && <RequestError message={error instanceof Error ? error.message : "Could not load beats."} retry={() => { void catalog.mutate(); }} />}
    {!data && isLoading ? <FrequencyLoader overlay={false} label="Finding your next sound…" /> : <div className={styles.beatGrid}>{tracks.map(beat => <BrowseBeatCard key={beat.id} beat={beat} queue={queue} />)}</div>}
    {!isLoading && !error && !tracks.length && <div className={styles.empty}><MusicNoteIcon /><h3>The next sound is on its way.</h3><p>No public beats have been added to this {discoveryLabels[kind].singular.toLowerCase()} yet.</p><NeumorphicLink href="/marketplace" variant="accent">Explore more beats <ArrowRightIcon /></NeumorphicLink></div>}
    <Pagination page={catalog.page} loading={isLoading} hasMore={Boolean(data?.hasMore)} previous={catalog.previous} next={() => { if (data?.nextCursor) catalog.next(data.nextCursor); }} />
  </section>;
}
