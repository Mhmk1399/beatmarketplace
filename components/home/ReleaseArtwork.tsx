"use client";

import Image from "next/image";
import { useAudioActions, useAudioTransport } from "@/components/audio/AudioPlayerProvider";
import { PlayerPauseIcon } from "@/components/audio/PlayerIcons";
import { TrackSpectrum } from "@/components/audio/TrackSpectrum";
import { PlayIcon, WaveformIcon } from "@/components/ui/icons";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { demoTracks } from "@/lib/audio/demo-tracks";
import { ReleaseWave } from "./ReleaseWave";
import styles from "./release-sections.module.css";

export function ReleaseArtwork() {
  const { toggle } = useAudioActions();
  const transport = useAudioTransport();
  const demo = demoTracks[0];
  const active = transport.track?.id === demo.id && transport.playing;

  return <div className={styles.releaseArtwork} data-playing={active}>
    <div className={styles.bigWave} aria-hidden="true"><ReleaseWave />{active && <div className={styles.liveWave}><TrackSpectrum trackId={demo.id} variant="bars" /></div>}</div>
    <div className={`${styles.releaseCard} ${styles.backCardThree}`} aria-hidden="true"><Image src="/assets/covers/coco.svg" alt="" fill sizes="(max-width: 599px) 90px, 150px" /></div>
    <div className={`${styles.releaseCard} ${styles.backCardTwo}`} aria-hidden="true"><Image src="/assets/genres/lo-fi.svg" alt="" fill sizes="(max-width: 599px) 100px, 170px" /></div>
    <div className={`${styles.releaseCard} ${styles.backCardOne}`} aria-hidden="true"><Image src="/assets/home-release/release-producer-small.webp" alt="" fill unoptimized sizes="(max-width: 599px) 120px, 200px" /></div>
    <div className={`${styles.releaseCard} ${styles.frontCard}`}>
      <picture>
        <source srcSet="/assets/home-release/release-producer-small.webp 320w, /assets/home-release/release-producer.webp 600w" sizes="(max-width: 599px) 160px, (max-width: 899px) 200px, 240px" type="image/webp" />
        <Image src="/assets/home-release/release-producer.webp" alt="" width={600} height={750} unoptimized loading="lazy" />
      </picture>
      <WaveformIcon className={styles.coverMark} />
      <NeumorphicButton variant="accent" className={styles.play} aria-label={`${active ? "Pause" : "Play"} ${demo.title} demo`} aria-pressed={active} onClick={() => toggle(demo, demoTracks)} title={`${demo.title} · listening room demo`}>
        {active ? <PlayerPauseIcon /> : <PlayIcon />}
      </NeumorphicButton>
    </div>
  </div>;
}
