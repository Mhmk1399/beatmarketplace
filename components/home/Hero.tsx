import { FeaturedBeats, type FeaturedBeatsProps } from "@/components/home/FeaturedBeats";
import { HeroActions } from "./HeroActions";
import {
  DiscIcon,
  ShieldIcon,
  TagIcon,
} from "@/components/ui/icons";

export function Hero(props: FeaturedBeatsProps) {
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
              Original beats for your next release. Preview the sound, choose
              your license, and pay in toman.
            </p>
            <HeroActions />
          </div>
          <FeaturedBeats {...props} />
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
