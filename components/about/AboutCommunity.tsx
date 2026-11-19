import Image from "next/image";
import { FileTextIcon, MusicNoteIcon } from "@/components/ui/icons";
import { AboutHeadphonesIcon } from "./AboutIcons";
import { AboutCommunityCta } from "./AboutCommunityCta";
import { AboutRibbon } from "./AboutRibbon";

// Product capabilities are factual; do not replace them with invented community counts.
const highlights = [
  { value: "30s", label: "Preview length", Icon: AboutHeadphonesIcon },
  { value: "WAV", label: "Download format", Icon: MusicNoteIcon },
  { value: "3", label: "License types", Icon: FileTextIcon },
];

export function AboutCommunity() {
  return <section className="about-section about-community" aria-labelledby="about-community-title">
    <AboutRibbon variant="community" />
    <div className="about-container about-community-grid">
      <div className="about-copy about-community-copy">
        <p className="about-eyebrow"><span aria-hidden="true" />Our community</p>
        <h2 id="about-community-title">Built for a<br /><span>creative community.</span></h2>
        <p className="about-intro">From bedroom producers to emerging artists, BeatMarketplace brings together people who live and breathe music.</p>
        <div className="about-actions"><AboutCommunityCta /></div>
      </div>
      <div className="about-community-visual">
        <dl className="about-highlights">{highlights.map(({ value, label, Icon }) => <div key={label} className="about-highlight"><dt><Icon /><span>{label}</span></dt><dd>{value}</dd></div>)}</dl>
        <div className="about-studio"><Image src="/assets/about/studio.webp" alt="A music producer wearing headphones, creating a track between two studio speakers" fill sizes="(max-width:699px) 96vw, (max-width:1099px) 56vw, 740px" /></div>
      </div>
    </div>
  </section>;
}
