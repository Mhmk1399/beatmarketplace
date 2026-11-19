import Image from "next/image";
import { CreateCta } from "@/components/home/CreateCta";
import { CheckIcon, ClockIcon, FileTextIcon, LayersIcon, MonitorIcon, PlayIcon, PlusIcon, SlidersIcon, UploadIcon, WaveformIcon } from "@/components/ui/icons";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { ProducerPreview } from "./ProducerPreview";
import styles from "./studio-sections.module.css";

const studioSteps = [
  { title: "Producer Studio", detail: "Your space to create, upload, and grow.", icon: MonitorIcon },
  { title: "Upload your original", detail: "Keep your full WAV protected.", icon: UploadIcon },
  { title: "Choose the moment", detail: "Set the 30-second preview and showcase your sound.", icon: SlidersIcon },
  { title: "Make your terms clear", detail: "Define licenses, prices, and timed offers.", icon: FileTextIcon },
];

export function ProducerSection() {
  return (
    <section id="producer" className={`music-home-section ${styles.producerSection}`} aria-labelledby="producer-title">
      <div className="music-home-container">
        <div className={styles.producerPanel}>
          <div className={styles.producerPortrait} aria-hidden="true"><picture><source srcSet="/assets/home-studio/producer-listening-small.webp 400w, /assets/home-studio/producer-listening.webp 700w" sizes="(max-width: 599px) 80vw, (max-width: 899px) 45vw, 440px" type="image/webp" /><Image src="/assets/home-studio/producer-listening.webp" alt="" width={700} height={875} unoptimized loading="lazy" /></picture></div>
          <div className={styles.producerCopy}>
            <p className={styles.kicker}><LayersIcon />The other side of the sound</p>
            <h2 id="producer-title">Made in your studio.<br />Ready for <span>their story.</span></h2>
            <p className={styles.producerLead}>Give your beats a place to be heard. Build your catalog, choose your previews, and set the terms that work for your music.</p>
            <div className={styles.producerActions}><CreateCta label="Start producing" leadingIcon={<PlusIcon className="size-4" />} /><NeumorphicLink href="#how-it-works" variant="quiet"><PlayIcon className="size-3.5" />See how it works</NeumorphicLink></div>
            <ul className={styles.producerFeatures}><li><ClockIcon /><div><strong>30 sec</strong><span>Your preview</span></div></li><li><WaveformIcon /><div><strong>WAV</strong><span>Full-quality files</span></div></li><li><LayersIcon /><div><strong>Your terms</strong><span>License & pricing</span></div></li></ul>
          </div>
          <div className={styles.previewPlacement}><ProducerPreview /></div>
          <div className={styles.studioFlow}>
            <ol>{studioSteps.map(({title,detail,icon:Icon},index)=><li key={title} data-featured={index===2}><span className={styles.flowIcon}><Icon /></span><div><h3>{title}</h3><p>{detail}</p></div><span className={styles.flowNumber}>0{index+1}</span></li>)}</ol>
            <p className={styles.flowFootnote}><span><CheckIcon /></span>Built around independent producers.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
