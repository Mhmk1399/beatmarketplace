import Image from "next/image";
import Link from "next/link";
import type { ProducerSummary } from "@/lib/producers/types";
import { ArrowRightIcon, MusicNoteIcon } from "@/components/ui/icons";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";
import styles from "./producers.module.css";

export function ProducerAvatar({ name, src }: { name: string; src: string | null }) {
  return <span className={styles.avatar}>{src ? <Image src={src} alt={`${name} profile`} fill unoptimized sizes="120px" /> : <span aria-hidden="true">{Array.from(name.trim())[0]?.toUpperCase() || "♪"}</span>}</span>;
}
export function ProducerCard({ producer }: { producer: ProducerSummary }) {
  return <Link href={producer.href} prefetch={false} className={styles.card} aria-label={`Visit ${producer.stageName}, ${producer.beatCount} public beats`}>
    <span className={styles.cardBanner}>{producer.bannerUrl && <Image src={producer.bannerUrl} alt="" fill unoptimized sizes="(max-width:639px) 100vw, (max-width:1023px) 50vw, 33vw" style={{ objectPosition: producer.bannerPosition }} />}<span className={styles.bannerShade} /></span>
    <span className={styles.cardBody}><ProducerAvatar name={producer.stageName} src={producer.avatarUrl} /><span className={styles.cardName}>{producer.stageName}</span>
      <span className={styles.cardTagline}>{producer.tagline || producer.storefrontName}</span>
      <span className={styles.chips}>{producer.genres.slice(0, 3).map(genre => <span key={genre.id}>{genre.name}</span>)}</span>
      <span className={styles.cardFooter}><span><MusicNoteIcon /><strong>{producer.beatCount.toLocaleString("en-US")}</strong> beats</span><span>Visit studio <ArrowRightIcon /></span></span>
    </span>
  </Link>;
}
export function ProducerHero({ producer, preview = false }: { producer: ProducerSummary; preview?: boolean }) {
  const Name = preview ? "h2" : "h1";
  return <section className={styles.hero} data-layout={producer.layout} aria-label={preview ? "Your page preview" : `${producer.stageName} studio`}>
    <div className={styles.banner}>
      {producer.bannerUrl && <Image src={producer.bannerUrl} alt={`${producer.stageName} studio banner`} fill unoptimized priority={!preview} sizes="(max-width:1279px) 100vw, 1280px" style={{ objectPosition: producer.bannerPosition }} />}
      <div className={styles.bannerShade} />
      <span className={styles.heroEyebrow}><MusicNoteIcon />{preview ? "YOUR PAGE · LIVE PREVIEW" : "INDEPENDENT PRODUCER"}</span>
    </div>
    <div className={styles.identity}>
      <ProducerAvatar name={producer.stageName} src={producer.avatarUrl} />
      <div className={styles.identityCopy}><p>{producer.storefrontName}</p><Name>{producer.stageName}</Name>{producer.tagline && <p className={styles.tagline}>{producer.tagline}</p>}<span className={styles.location}>{producer.username && <span>@{producer.username}</span>}{producer.location && <span>{producer.location}</span>}</span></div>
      {!preview && <NeumorphicLink href="#producer-catalog" variant="accent">Explore their beats <ArrowRightIcon className="size-4" /></NeumorphicLink>}
    </div>
    {!preview && <div className={styles.stats}><span><strong>{producer.beatCount.toLocaleString("en-US")}</strong>Public beats</span><span><strong>{producer.genres.length}</strong>Music styles</span><span><strong>{new Date(producer.memberSince).getUTCFullYear()}</strong>Here since</span><div className={styles.chips}>{producer.genres.map(genre => <Link key={genre.id} href={`/marketplace?genre=${encodeURIComponent(genre.slug)}`} prefetch={false}>{genre.name}</Link>)}</div></div>}
  </section>;
}
