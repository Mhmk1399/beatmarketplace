import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/public/PublicShell";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { ArrowRightIcon, MusicNoteIcon } from "@/components/ui/icons";
import { MarketRibbon } from "@/components/marketplace/MarketRibbon";
import { discoveryBeatPage, getDiscoveryItem } from "@/lib/marketplace/discovery-server";
import { publicTaxonomyPage } from "@/lib/marketplace/taxonomy-list";
import { discoveryHref, discoveryLabels, type DiscoveryKind } from "@/lib/marketplace/discovery";
import { DiscoveryCatalog, DiscoveryDirectory } from "./DiscoveryBrowser";
import styles from "./discovery.module.css";

export async function discoveryMetadata(kind: DiscoveryKind, slug: string): Promise<Metadata> {
  const item = await getDiscoveryItem(kind, slug);
  if (!item) return { title: "Sound not found" };
  return { title: `${item.name} beats`, description: item.description || `Discover original ${item.name.toLowerCase()} beats. Listen to producer-selected previews and find your next sound.`, alternates: { canonical: discoveryHref(kind, item.slug) } };
}
export async function DiscoveryIndexPage({ kind }: { kind: DiscoveryKind }) {
  const initial = await publicTaxonomyPage(kind);
  const copy = discoveryLabels[kind];
  return <PublicShell><div className={styles.page}><header className={styles.directoryHeader}><MarketRibbon /><p className={styles.eyebrow}>EXPLORE BY {copy.singular.toUpperCase()}</p><h1>{copy.heading}</h1><p>{copy.description}</p><nav className={styles.exploreLinks} aria-label="Ways to explore"><NeumorphicLink href="/marketplace" size="sm">All beats</NeumorphicLink><NeumorphicLink href={kind === "moods" ? "/instruments" : "/moods"} size="sm">Explore {kind === "moods" ? "instruments" : "moods"} <ArrowRightIcon /></NeumorphicLink></nav></header><DiscoveryDirectory kind={kind} initial={initial} /></div></PublicShell>;
}
export async function DiscoveryDetailPage({ kind, slug }: { kind: DiscoveryKind; slug: string }) {
  const item = await getDiscoveryItem(kind, slug);
  if (!item) notFound();
  const initial = await discoveryBeatPage(kind, item.id);
  return <PublicShell><div className={styles.page}>
    <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href={`/${kind}`}>← All {kind}</Link><span aria-current="page">{item.name}</span></nav>
    <header className={styles.hero} data-image={Boolean(item.bannerUrl)}>
      {item.bannerUrl ? <span className={styles.heroArt}><Image src={item.bannerUrl} alt="" fill unoptimized sizes="100vw" /></span> : <><MarketRibbon /><MusicNoteIcon className={styles.heroNote} /></>}
      <div className={styles.heroCopy}><p className={styles.eyebrow}>EXPLORE THIS {discoveryLabels[kind].singular.toUpperCase()}</p><h1>{item.name} <span>Beats</span></h1><p>{item.description || `Discover original beats ${kind === "moods" ? "that match this feeling" : "built around this sound"}. Find your moment, listen, and make it yours.`}</p><NeumorphicLink href="#discovery-beats" variant="accent" size="sm">Find your sound <ArrowRightIcon /></NeumorphicLink></div>
    </header>
    <DiscoveryCatalog key={item.id} kind={kind} item={item} initial={initial} />
  </div></PublicShell>;
}
