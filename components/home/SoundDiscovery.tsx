import { CoverImage } from "@/components/ui/CoverImage";
import { ArrowRightIcon, PianoIcon, WaveformIcon } from "@/components/ui/icons";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { discoveryHref, discoveryLabels, type DiscoveryKind } from "@/lib/marketplace/discovery";
import type { TaxonomyItem } from "@/lib/marketplace/types";
import styles from "./sound-discovery.module.css";

function DiscoveryShelf({ kind, items }: { kind: DiscoveryKind; items: TaxonomyItem[] }) {
  const { plural } = discoveryLabels[kind];
  const Icon = kind === "moods" ? WaveformIcon : PianoIcon;

  return (
    <section className={styles.shelf} id={`explore-${kind}`} aria-labelledby={`home-${kind}-title`}>
      <header className={styles.heading}>
        <div className={styles.title}>
          <span className={styles.icon} aria-hidden="true"><Icon /></span>
          <h2 id={`home-${kind}-title`}>{plural}</h2>
        </div>
        <NeumorphicLink href={`/${kind}`} variant="quiet" size="sm" prefetch={false} className={styles.directoryLink}>
          All {plural.toLowerCase()} <ArrowRightIcon aria-hidden="true" />
        </NeumorphicLink>
      </header>
      {items.length > 0 ? (
        <ul className={styles.cards}>
          {items.map(item => (
            <li key={item.id}>
              <NeumorphicLink
                href={discoveryHref(kind, item.slug)}
                aria-label={`Explore ${item.name} beats`}
                prefetch={false}
                variant="quiet"
                className={styles.card}
              >
                <CoverImage
                  src={item.thumbnailUrl ?? ""}
                  alt=""
                  sizes="(max-width: 639px) 45vw, (max-width: 1023px) 23vw, 290px"
                  loading="lazy"
                  position="center 40%"
                  className={styles.art}
                />
                <span className={styles.cardCopy}>
                  <strong>{item.name}</strong>
                  {item.description && <span>{item.description}</span>}
                </span>
                <span className={styles.arrow} aria-hidden="true"><ArrowRightIcon /></span>
              </NeumorphicLink>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>Browse all {plural.toLowerCase()} in the catalog.</p>
      )}
    </section>
  );
}

export function SoundDiscovery({ moods, instruments }: { moods: TaxonomyItem[]; instruments: TaxonomyItem[] }) {
  return (
    <div className="music-home-section">
      <div className={`music-home-container ${styles.layout}`}>
        <DiscoveryShelf kind="moods" items={moods} />
        <DiscoveryShelf kind="instruments" items={instruments} />
      </div>
    </div>
  );
}
