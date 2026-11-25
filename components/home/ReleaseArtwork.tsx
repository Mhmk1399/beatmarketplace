"use client";

import { useAudioActions, useAudioTransport } from "@/components/audio/AudioPlayerProvider";
import { PlayerPauseIcon } from "@/components/audio/PlayerIcons";
import { TrackSpectrum } from "@/components/audio/TrackSpectrum";
import { PlayIcon, WaveformIcon } from "@/components/ui/icons";
import { CoverImage } from "@/components/ui/CoverImage";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { marketplaceAudioTrack } from "@/lib/audio/marketplace-track";
import type { HomeResponsiveImage } from "@/lib/home/types";
import type { MarketplaceTrack } from "@/lib/marketplace/types";
import { HomeEditorialPicture } from "./HomeEditorialPicture";
import { ReleaseWave } from "./ReleaseWave";
import styles from "./release-sections.module.css";

const cardPositions = [styles.backCardOne, styles.backCardTwo, styles.backCardThree];

export function ReleaseArtwork({ tracks, image }: { tracks: MarketplaceTrack[]; image: HomeResponsiveImage | null }) {
  const { toggle } = useAudioActions();
  const transport = useAudioTransport();
  const queue = tracks.filter(track => track.previewUrl).slice(0, 5).map(marketplaceAudioTrack);
  const preview = queue[0];
  const active = Boolean(preview && transport.track?.id === preview.id && transport.playing);
  const artworkTracks = tracks.filter(track => track.artworkUrl).slice(0, 3);

  return <div className={styles.releaseArtwork} data-playing={active}>
    <div className={styles.bigWave} aria-hidden="true"><ReleaseWave />{active && preview && <div className={styles.liveWave}><TrackSpectrum trackId={preview.id} variant="bars" /></div>}</div>
    {artworkTracks.map((track, index) => <div key={track.id} className={`${styles.releaseCard} ${cardPositions[index]}`} aria-hidden="true">
      <CoverImage src={track.artworkUrl ?? ""} alt="" sizes="(max-width: 599px) 120px, 200px" />
    </div>)}
    <div className={`${styles.releaseCard} ${styles.frontCard}`}>
      {image ? <HomeEditorialPicture image={image} sizes="(max-width: 599px) 160px, (max-width: 899px) 200px, 240px" /> : <CoverImage src={preview?.coverUrl || artworkTracks[0]?.artworkUrl || ""} alt="" sizes="(max-width: 599px) 160px, 240px" />}
      <WaveformIcon className={styles.coverMark} aria-hidden="true" />
      {preview && <NeumorphicButton variant="accent" className={styles.play} aria-label={`${active ? "Pause" : "Play"} preview for ${preview.title}`} aria-pressed={active} onClick={() => toggle(preview, queue)} title={`${preview.title} · 30-second preview`}>
        {active ? <PlayerPauseIcon /> : <PlayIcon />}
      </NeumorphicButton>}
    </div>
  </div>;
}
