import { FeaturedBeats } from "@/components/home/FeaturedBeats";
import {
  ArrowRightIcon,
  DiscIcon,
  PlayIcon,
  ShieldIcon,
  TagIcon,
} from "@/components/ui/icons";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { demoTracks } from "@/lib/audio/demo-tracks";

export function Hero() {
  return (
    <section
      className="hero-showcase music-home-hero"
      aria-labelledby="home-title"
    >
      <div className="hero-showcase-content music-home-container">
        <div className="hero-showcase-grid">
          <div className="hero-showcase-copy">
            <p className="hero-showcase-kicker">
              <span className="music-status-dot" aria-hidden="true" /> An
              independent sound space
            </p>
            <h1 id="home-title">
              Find your next
              <br />
              <span className="text-gradient">signature sound.</span>
            </h1>
            <p className="hero-showcase-intro">
              Original beats from independent producers. Find the feeling, hear
              the potential, and make your next release your own.
            </p>
            <div className="hero-showcase-actions">
              <NeumorphicLink href="/marketplace" variant="accent" size="lg">
                Explore beats <ArrowRightIcon className="size-4" />
              </NeumorphicLink>
              <NeumorphicLink href="/#listening-room" variant="quiet" size="lg">
                <PlayIcon className="size-5" /> Just listen
              </NeumorphicLink>
            </div>
          </div>
          <FeaturedBeats demos={demoTracks} />
        </div>
        <div
          className="hero-showcase-promises"
          aria-label="Marketplace features"
        >
          <div>
            <DiscIcon />
            <span>
              <strong>30 sec</strong>
              <small>Hear your preview</small>
            </span>
          </div>
          <div>
            <ShieldIcon />
            <span>
              <strong>Your release</strong>
              <small>Producer-defined licenses</small>
            </span>
          </div>
          <div>
            <TagIcon />
            <span>
              <strong>Toman</strong>
              <small>Clear license pricing</small>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
