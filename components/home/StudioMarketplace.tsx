import { BrowseBeatCard } from "@/components/marketplace/BrowseBeatCard";
import { ArrowRightIcon, BoltIcon, DiscIcon, InfinityIcon, PlayIcon, RadioIcon, WaveformIcon } from "@/components/ui/icons";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { marketplaceAudioTrack } from "@/lib/audio/marketplace-track";
import type { HomeResponsiveImage } from "@/lib/home/types";
import type { MarketplaceTrack } from "@/lib/marketplace/types";
import { CreateCta } from "./CreateCta";
import { HomeEditorialPicture } from "./HomeEditorialPicture";
import styles from "./studio-sections.module.css";

const benefits = [
  { title: "Original beats", detail: "Independent sounds", Icon: WaveformIcon },
  { title: "Independent creators", detail: "Real producers", Icon: BoltIcon },
  { title: "Instant access", detail: "After verified payment", Icon: InfinityIcon },
];

export function StudioMarketplace({ tracks, image, unavailable }: { tracks: MarketplaceTrack[]; image: HomeResponsiveImage | null; unavailable: boolean }) {
  const queue = tracks.map(marketplaceAudioTrack);
  return <section id="sounds" className={`music-home-section ${styles.marketSection}`} aria-labelledby="fresh-studio-title">
    <div className="music-home-container">
      <div className={styles.marketHero}>
        <div className={styles.marketArt} aria-hidden="true"><HomeEditorialPicture image={image} sizes="(max-width: 1280px) 100vw, 1280px" /></div>
        <div className={styles.marketNav}><NeumorphicLink href="/discounts" variant="quiet"><span className={styles.liveDot} aria-hidden="true" />Live offers</NeumorphicLink><NeumorphicLink href="/marketplace">All beats<ArrowRightIcon className="size-4" /></NeumorphicLink></div>
        <header className={styles.marketCopy}>
          <p className={styles.kicker}><DiscIcon />The marketplace</p>
          <h2 id="fresh-studio-title">Fresh from<br />the <span>studio.</span></h2>
          <p className={styles.marketLead}>Independent sounds. A new place to start.</p>
          <div className={styles.marketActions}><NeumorphicLink href="/marketplace" variant="accent"><PlayIcon className="size-4" />Explore beats<ArrowRightIcon className="size-4" /></NeumorphicLink><NeumorphicLink href="/discounts" variant="quiet"><RadioIcon className="size-4" />Live offers<span className={styles.liveDot} aria-hidden="true" /></NeumorphicLink></div>
          <ul className={styles.benefits}>{benefits.map(({title,detail,Icon})=><li key={title}><Icon /><div><strong>{title}</strong><span>{detail}</span></div></li>)}</ul>
        </header>
        <div className={styles.marketStatus}>
          <div className={styles.statusMessage}>
            <span className={styles.statusIcon} aria-hidden="true"><WaveformIcon /></span>
            {unavailable ? <div><h3>The studio needs a moment.</h3><p>The latest beats are temporarily unavailable.</p><NeumorphicLink href="/marketplace" size="sm">Browse beats<ArrowRightIcon className="size-4" /></NeumorphicLink></div>
              : tracks.length ? <div><h3>Fresh takes. New possibilities.</h3><p>Explore the latest sounds from independent producers.</p><NeumorphicLink href="#latest-studio-beats" size="sm" className={styles.workspaceButton}>Listen below<ArrowRightIcon className="size-4" /></NeumorphicLink></div>
              : <div><h3>The studio is warming up.</h3><p>Original music starts with independent producers.<br />Upload your first beat from Producer Studio.</p><CreateCta label="Open your workspace" variant="default" className={styles.workspaceButton} /></div>}
          </div>
        </div>
      </div>
      {tracks.length > 0 && <div id="latest-studio-beats" className={styles.latestBeats} aria-label="Latest published beats"><div className={styles.latestHeading}><p><span className={styles.liveDot} aria-hidden="true" />Freshly released</p><span>Producer-selected 30-second previews</span></div><div className={styles.latestGrid}>{tracks.map(track=><BrowseBeatCard key={track.id} beat={track} queue={queue} />)}</div></div>}
    </div>
  </section>;
}
