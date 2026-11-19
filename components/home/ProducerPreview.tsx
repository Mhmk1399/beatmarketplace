"use client";

import { useAudioPlayer } from "@/components/audio/AudioPlayerProvider";
import { PlayerPauseIcon } from "@/components/audio/PlayerIcons";
import { TrackSpectrum } from "@/components/audio/TrackSpectrum";
import { PlayIcon } from "@/components/ui/icons";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { demoTracks } from "@/lib/audio/demo-tracks";
import { formatAudioTime } from "@/lib/audio/utils";
import type { AudioTrack } from "@/lib/audio/types";
import demoWaveforms from "@/lib/audio/demo-player-waveforms.json";
import styles from "./studio-sections.module.css";

// Public local demo only. Marketplace uploads keep their server-generated protected previews.
const preview: AudioTrack = { ...demoTracks[0], id: "demo-producer-studio", durationLimitSeconds: 30, description: "A 30-second listening demonstration for Producer Studio." };
const waveform = demoWaveforms[demoTracks[0].id as keyof typeof demoWaveforms];
const path = Array.from({length:42},(_,index)=>{const amplitude=waveform[Math.floor(index/42*waveform.length)]??0;const height=3+Math.pow(amplitude,1.3)*32;return `M${index*4+2} ${(40-height)/2}v${height}`;}).join("");

export function ProducerPreview() {
  const player = useAudioPlayer();
  const current = player.track?.id === preview.id;
  const playing = current && player.playing;
  const elapsed = current ? Math.min(30, player.elapsed) : 0;
  return <div className={styles.previewPlayer} role="group" aria-label="Producer Studio 30-second demo" data-playing={playing}>
    <NeumorphicButton variant="accent" className={styles.previewPlay} aria-label={`${playing ? "Pause" : "Play"} 30-second producer demo`} aria-pressed={playing} onClick={()=>player.toggle(preview,[preview])}>{playing?<PlayerPauseIcon/>:<PlayIcon/>}</NeumorphicButton>
    <div className={styles.previewWave}>
      <svg viewBox="0 0 168 40" fill="none" aria-hidden="true" preserveAspectRatio="none"><path d={path} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
      {playing&&<div className={styles.previewLive}><TrackSpectrum trackId={preview.id} variant="bars"/></div>}
      <input type="range" aria-label="Producer demo playback position" aria-valuetext={`${formatAudioTime(elapsed)} of 0:30`} min={0} max={30} step={.1} value={elapsed} disabled={!current} onChange={event=>player.seek(Number(event.target.value))}/>
    </div>
    <span className={styles.previewTime}>{formatAudioTime(elapsed)} / 0:30</span>
  </div>;
}
