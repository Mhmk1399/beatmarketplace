import Form from "next/form";
import { ArrowRightIcon, MusicNoteIcon, PlayIcon, SearchIcon } from "@/components/ui/icons";
import { NeumorphicButton, NeumorphicLink } from "@/components/ui/neumorphic/Button";
import styles from "./home-discovery.module.css";

export function HeroSearch() {
  return <div className={styles.discovery}>
    <Form action="/marketplace" prefetch={false} role="search" aria-label="Find beats in the marketplace" className={styles.search}>
      <label htmlFor="home-beat-search" className="sr-only">Search beats, producers, or tags</label>
      <SearchIcon className={styles.searchIcon} />
      <input id="home-beat-search" name="q" type="search" dir="auto" maxLength={160} placeholder="Beat, producer, or tag…" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="search" />
      <NeumorphicButton type="submit" variant="accent" className={styles.searchButton}>Find beats<ArrowRightIcon className="size-4" /></NeumorphicButton>
    </Form>
    <div className={styles.intents} aria-label="Explore your next step">
      <NeumorphicLink href="/#listening-room" variant="quiet" size="sm"><PlayIcon className="size-4" />Just listen</NeumorphicLink>
      <NeumorphicLink href="/#producer" variant="quiet" size="sm"><MusicNoteIcon className="size-4" />I make beats<ArrowRightIcon className="size-3.5" /></NeumorphicLink>
    </div>
  </div>;
}
