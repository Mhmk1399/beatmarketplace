"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { BrowseBeatCard } from "@/components/marketplace/BrowseBeatCard";
import { FrequencyLoader } from "@/components/ui/dynamic/GlobalLoading";
import { ArrowRightIcon, BoltIcon, DiscIcon, InfinityIcon, PlayIcon, RadioIcon, WaveformIcon } from "@/components/ui/icons";
import { NeumorphicButton, NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { synchronizeDiscountClock } from "@/components/discounts/clock";
import { marketplaceAudioTrack } from "@/lib/audio/marketplace-track";
import type { MarketplaceTrack } from "@/lib/marketplace/types";
import { CreateCta } from "./CreateCta";
import styles from "./studio-sections.module.css";

const benefits = [
  { title: "Original beats", detail: "Independent sounds", Icon: WaveformIcon },
  { title: "Independent creators", detail: "Real producers", Icon: BoltIcon },
  { title: "Instant access", detail: "After verified payment", Icon: InfinityIcon },
];

export function StudioMarketplace() {
  const [tracks, setTracks] = useState<MarketplaceTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;
    const timeout = setTimeout(() => controller.abort(), 15_000);
    void fetch("/api/tracks?pageSize=4&pagination=cursor&sort=newest", { signal: controller.signal, cache: "no-store" }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "We couldn’t load the latest beats.");
      if (!Array.isArray(data.tracks)) throw new Error("The studio returned an incomplete response. Please try again.");
      if (!mounted) return;
      synchronizeDiscountClock(data.serverTime ?? response.headers.get("date"));
      setTracks(data.tracks.slice(0, 4));
      setError("");
    }).catch(failure => {
      if (mounted) setError(controller.signal.aborted ? "Loading is taking longer than expected. Please try again." : failure instanceof Error ? failure.message : "We couldn’t load the latest beats.");
    }).finally(() => { clearTimeout(timeout); if (mounted) setLoading(false); });
    return () => { mounted = false; clearTimeout(timeout); controller.abort(); };
  }, [revision]);

  return <section id="sounds" className={`music-home-section ${styles.marketSection}`} aria-labelledby="fresh-studio-title">
    <div className="music-home-container">
      <div className={styles.marketHero}>
        <div className={styles.marketArt} aria-hidden="true"><picture>
          <source media="(max-width: 599px)" srcSet="/assets/home-studio/marketplace-studio-mobile.webp" type="image/webp" />
          <source srcSet="/assets/home-studio/marketplace-studio-medium.webp 1000w, /assets/home-studio/marketplace-studio.webp 1600w" sizes="(max-width: 1280px) 100vw, 1280px" type="image/webp" />
          <Image src="/assets/home-studio/marketplace-studio.webp" alt="" width={1600} height={533} unoptimized loading="lazy" />
        </picture></div>
        <div className={styles.marketNav}><NeumorphicLink href="/discounts" variant="quiet"><span className={styles.liveDot} aria-hidden="true" />Live offers</NeumorphicLink><NeumorphicLink href="/marketplace">All beats<ArrowRightIcon className="size-4" /></NeumorphicLink></div>
        <header className={styles.marketCopy}>
          <p className={styles.kicker}><DiscIcon />The marketplace</p>
          <h2 id="fresh-studio-title">Fresh from<br />the <span>studio.</span></h2>
          <p className={styles.marketLead}>Independent sounds. A new place to start.</p>
          <div className={styles.marketActions}><NeumorphicLink href="/marketplace" variant="accent"><PlayIcon className="size-4" />Explore beats<ArrowRightIcon className="size-4" /></NeumorphicLink><NeumorphicLink href="/discounts" variant="quiet"><RadioIcon className="size-4" />Live offers<span className={styles.liveDot} aria-hidden="true" /></NeumorphicLink></div>
          <ul className={styles.benefits}>{benefits.map(({title,detail,Icon})=><li key={title}><Icon /><div><strong>{title}</strong><span>{detail}</span></div></li>)}</ul>
        </header>
        <div className={styles.marketStatus} aria-busy={loading}>
          {loading ? <div className={styles.loading}><FrequencyLoader overlay={false} label="Finding fresh beats…" /></div> : error ? <div className={styles.statusMessage} role="alert"><span className={styles.statusIcon} aria-hidden="true"><WaveformIcon /></span><div><h3>The studio needs a moment.</h3><p>{error}</p><NeumorphicButton size="sm" onClick={()=>{setLoading(true);setError("");setRevision(value=>value+1);}}>Try again<ArrowRightIcon className="size-4" /></NeumorphicButton></div></div> : tracks.length ? <div className={styles.statusMessage}><span className={styles.statusIcon} aria-hidden="true"><WaveformIcon /></span><div><h3>Fresh takes. New possibilities.</h3><p>Explore the latest sounds from independent producers.</p><NeumorphicLink href="#latest-studio-beats" size="sm" className={styles.workspaceButton}>Listen below<ArrowRightIcon className="size-4" /></NeumorphicLink></div></div> : <div className={styles.statusMessage}><span className={styles.statusIcon} aria-hidden="true"><WaveformIcon /></span><div><h3>The studio is warming up.</h3><p>Original music starts with independent producers.<br />Upload your first beat from Producer Studio.</p><CreateCta label="Open your workspace" variant="default" className={styles.workspaceButton} /></div></div>}
        </div>
      </div>
      {!loading && !error && tracks.length > 0 && <div id="latest-studio-beats" className={styles.latestBeats} aria-label="Latest published beats"><div className={styles.latestHeading}><p><span className={styles.liveDot} aria-hidden="true" />Freshly released</p><span>Producer-selected 30-second previews</span></div><div className={styles.latestGrid}>{tracks.map(track=><BrowseBeatCard key={track.id} beat={track} queue={tracks.map(marketplaceAudioTrack)} />)}</div></div>}
    </div>
  </section>;
}
