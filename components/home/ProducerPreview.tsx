"use client";

import { useAudioPlayer } from "@/components/audio/AudioPlayerProvider";
import { PlayerPauseIcon } from "@/components/audio/PlayerIcons";
import { TrackSpectrum } from "@/components/audio/TrackSpectrum";
import { PlayIcon } from "@/components/ui/icons";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { marketplaceAudioTrack } from "@/lib/audio/marketplace-track";
import { formatAudioTime } from "@/lib/audio/utils";
import type { MarketplaceTrack } from "@/lib/marketplace/types";
import styles from "./studio-sections.module.css";

export function ProducerPreview({ track }: { track: MarketplaceTrack | undefined }) {
  const player = useAudioPlayer();
  if (!track?.previewUrl) return null;

  const preview = marketplaceAudioTrack(track);
  const current = player.track?.id === preview.id;
  const playing = current && player.playing;
  const limit = preview.durationLimitSeconds ?? 30;
  const duration = current && player.duration > 0 ? Math.min(limit, player.duration) : limit;
  const elapsed = current ? Math.min(duration, player.elapsed) : 0;
  const endTime = formatAudioTime(duration);
  return <div className={styles.previewPlayer} role="group" aria-label={`${track.title} preview`} data-playing={playing}>
    <NeumorphicButton variant="accent" className={styles.previewPlay} aria-label={`${playing ? "Pause" : "Play"} preview for ${track.title}`} aria-pressed={playing} onClick={() => player.toggle(preview, [preview])}>
      {playing ? <PlayerPauseIcon /> : <PlayIcon />}
    </NeumorphicButton>
    <div className={styles.previewWave}>
      <svg viewBox="0 0 168 40" fill="none" aria-hidden="true" preserveAspectRatio="none">
        <path d="M2 20H166" stroke="currentColor" strokeWidth="2.2" strokeDasharray="1 3" strokeLinecap="round" />
      </svg>
      {playing && <div className={styles.previewLive}><TrackSpectrum trackId={preview.id} variant="bars" /></div>}
      <input type="range" aria-label="Preview playback position" aria-valuetext={`${formatAudioTime(elapsed)} of ${endTime}`} min={0} max={duration} step={.1} value={elapsed} disabled={!current} onChange={event => player.seek(Number(event.target.value))} />
    </div>
    <span className={styles.previewTime}>{formatAudioTime(elapsed)} / {endTime}</span>
  </div>;
}
