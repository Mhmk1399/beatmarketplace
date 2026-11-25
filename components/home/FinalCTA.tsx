import { CreateCta } from "@/components/home/CreateCta";
import { ArrowRightIcon, MusicNoteIcon, UploadIcon } from "@/components/ui/icons";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { ReleaseArtwork } from "./ReleaseArtwork";
import type { HomeResponsiveImage } from "@/lib/home/types";
import type { MarketplaceTrack } from "@/lib/marketplace/types";
import styles from "./release-sections.module.css";

export function FinalCTA({ tracks, image }: { tracks: MarketplaceTrack[]; image: HomeResponsiveImage | null }) {
  return (
    <section id="your-next-sound" className={`music-home-section ${styles.section} ${styles.lastSection}`} aria-labelledby="final-cta-title">
      <div className="music-home-container">
        <div className={`${styles.panel} ${styles.ctaPanel}`}>
          <div className={styles.ctaCopy}>
            <p className={styles.kicker}>Go where the music takes you</p>
            <h2 id="final-cta-title">The next one could<br />be <span>your sound.</span></h2>
            <p className={styles.ctaDescription}>Discover fresh beats, license them with confidence,<br className={styles.desktopBreak} /> and bring your music to life.</p>
            <div className={styles.actions}>
              <NeumorphicLink href="/marketplace" variant="accent" className={styles.findBeat}><MusicNoteIcon className="size-5" />Find your beat<ArrowRightIcon className="size-4" /></NeumorphicLink>
              <CreateCta label="Bring your music" variant="quiet" leadingIcon={<UploadIcon className="size-5" />} className={styles.bringMusic} />
            </div>
          </div>
          <ReleaseArtwork tracks={tracks} image={image} />
        </div>
      </div>
    </section>
  );
}
