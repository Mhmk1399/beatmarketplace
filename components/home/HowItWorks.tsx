import Image from "next/image";
import { LayersIcon, SearchIcon, WaveformIcon } from "@/components/ui/icons";
import { ReleaseWave } from "./ReleaseWave";
import { HomeQuestions } from "./HomeQuestions";
import styles from "./release-sections.module.css";

function OutlinePlayIcon() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 4 13 8-13 8V4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>; }

const steps = [
  { label: "Find your feeling", detail: "Explore original beats by sound, genre, and tempo.", icon: SearchIcon },
  { label: "Hear the potential", detail: "Listen to the producer’s selected 30-second preview.", icon: OutlinePlayIcon },
  { label: "Choose your license", detail: "Read the usage terms and pick the right fit for your release.", icon: LayersIcon },
  { label: "Make it your own", detail: "Get the full WAV after verified payment and start creating.", icon: WaveformIcon },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className={`music-home-section ${styles.section}`} aria-labelledby="how-it-works-title">
      <div className="music-home-container">
        <div className={`${styles.panel} ${styles.flowPanel}`}>
          <div className={styles.studioArt} aria-hidden="true">
            <picture>
              <source media="(max-width: 599px)" srcSet="/assets/home-release/creative-flow-studio-mobile.webp" type="image/webp" />
              <source srcSet="/assets/home-release/creative-flow-studio-medium.webp 1000w, /assets/home-release/creative-flow-studio.webp 1600w" sizes="(max-width: 1280px) 100vw, 1280px" type="image/webp" />
              <Image src="/assets/home-release/creative-flow-studio.webp" alt="" width={1600} height={533} unoptimized loading="lazy" />
            </picture>
          </div>
          <header className={styles.flowIntro}>
            <p className={styles.kicker}><WaveformIcon />The creative flow</p>
            <h2 id="how-it-works-title">From first listen to your<br className={styles.desktopBreak} /> next <span>release.</span></h2>
            <ReleaseWave className={styles.smallWave} />
          </header>
          <ol className={styles.steps}>
            {steps.map(({ label, detail, icon: Icon }, index) => <li key={label}>
              <span className={styles.stepIcon} aria-hidden="true"><Icon /></span>
              <div className={styles.stepCopy}><span className={styles.stepNumber}>0{index + 1}</span><h3>{label}</h3><p>{detail}</p></div>
            </li>)}
          </ol>
        </div>
        <HomeQuestions />
      </div>
    </section>
  );
}
