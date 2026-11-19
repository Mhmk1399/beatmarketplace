import Image from "next/image";
import { CreateCta } from "@/components/home/CreateCta";
import { PlayIcon, ArrowRightIcon } from "@/components/ui/icons";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { AboutRibbon } from "./AboutRibbon";

export function AboutHero() {
  return <section className="about-section about-hero" aria-labelledby="about-hero-title">
    <div className="about-container about-hero-grid">
      <div className="about-copy">
        <p className="about-eyebrow"><span aria-hidden="true" />About BeatMarketplace</p>
        <h1 id="about-hero-title">We’re a home for<br /><span>independent sound.</span></h1>
        <p className="about-intro">BeatMarketplace is a creative platform where music producers and artists connect, discover original beats, and turn ideas into real releases.</p>
        <div className="about-actions">
          <NeumorphicLink href="/marketplace" variant="accent"><PlayIcon />Explore Beats<ArrowRightIcon /></NeumorphicLink>
          <CreateCta label="Join as a Producer" variant="default" />
        </div>
      </div>
      <div className="about-headphones" aria-hidden="true">
        <AboutRibbon variant="hero" />
        <span className="about-headphone-orbit" />
        <Image src="/assets/about/headphones.webp" alt="" fill sizes="(max-width:699px) 86vw, (max-width:1099px) 48vw, 600px" preload className="about-headphones-image" />
        <span className="about-headphone-orbit about-headphone-orbit-front" />
      </div>
    </div>
  </section>;
}
