import { ArrowRightIcon, MusicNoteIcon, PlayIcon } from "@/components/ui/icons";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";
import styles from "./home-discovery.module.css";
export function HeroActions() {
  return <div className={styles.discovery}><div className={styles.intents} aria-label="Explore your next step">
    <NeumorphicLink href="/marketplace" variant="accent"><PlayIcon className="size-4" />Explore beats<ArrowRightIcon className="size-4" /></NeumorphicLink>
    <NeumorphicLink href="/#listening-room" variant="default"><PlayIcon className="size-4" />Just listen</NeumorphicLink>
    <NeumorphicLink href="/#producer" variant="quiet" size="sm"><MusicNoteIcon className="size-4" />I make beats<ArrowRightIcon className="size-3.5" /></NeumorphicLink>
  </div></div>;
}
