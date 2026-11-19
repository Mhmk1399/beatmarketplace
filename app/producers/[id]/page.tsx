import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/public/PublicShell";
import { ProducerHero } from "@/components/producers/ProducerIdentity";
import { ProducerCatalog, ProducerBeatGrid } from "@/components/producers/ProducerCatalog";
import { getPublicProducerPage } from "@/lib/producers/server";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { PRODUCER_SOCIALS } from "@/lib/producers/types";
import styles from "@/components/producers/producers.module.css";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getPublicProducerPage((await params).id);
  return data ? { title: `${data.producer.stageName} · Producer studio`, description: data.producer.tagline || data.producer.bio.slice(0, 160) || `Explore original beats by ${data.producer.stageName}.` } : { title: "Producer not found" };
}
export default async function ProducerPage({ params }: Props) {
  const data = await getPublicProducerPage((await params).id); if (!data) notFound();
  const { producer, featured, catalog } = data;
  return <PublicShell><div className={styles.page}>
    <nav className={styles.breadcrumb} aria-label="Breadcrumb"><NeumorphicLink href="/producers" variant="quiet">← All producers</NeumorphicLink><span>{producer.stageName}</span></nav>
    <ProducerHero producer={producer} />
    <section className={styles.about} aria-labelledby="producer-about-title"><div><span className={styles.eyebrow}>BEHIND THE SOUND</span><h2 id="producer-about-title">Inside {producer.storefrontName}.</h2><p>{producer.bio || "This producer is preparing their story. Explore their original sound below."}</p></div><aside><h3>Connect with {producer.stageName}</h3><div className={styles.socials}>{producer.website && <a href={producer.website} target="_blank" rel="noopener noreferrer">Studio website ↗</a>}{PRODUCER_SOCIALS.filter(name => producer.socialLinks[name]).map(name => <a key={name} href={producer.socialLinks[name]} target="_blank" rel="noopener noreferrer">{name === "twitter" ? "X / Twitter" : name} ↗</a>)}</div>{!producer.website && !PRODUCER_SOCIALS.some(name => producer.socialLinks[name]) && <p>New ways to connect are coming soon.</p>}</aside></section>
    {featured.length > 0 && <section className={styles.featured} aria-labelledby="producer-featured-title"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>SELECTED BY THE PRODUCER</span><h2 id="producer-featured-title">Start with these.</h2></div><span>{featured.length} featured beats</span></div><ProducerBeatGrid tracks={featured} /></section>}
    <ProducerCatalog producerId={producer.id} name={producer.stageName} initial={catalog} />
  </div></PublicShell>;
}
