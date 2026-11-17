"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type CSSProperties } from "react";

import { useAudioPlayer } from "@/components/audio/AudioPlayerProvider";
import { PlayerTimeline as Timeline } from "@/components/audio/PlayerTimeline";
import { PlayerCloseIcon, PlayerCollapseIcon, PlayerExpandIcon, PlayerLoaderIcon, PlayerMusicIcon, PlayerNextIcon, PlayerPauseIcon, PlayerPlayIcon, PlayerPreviousIcon, PlayerQueueIcon, PlayerRepeatIcon, PlayerShuffleIcon, PlayerSkipIcon, PlayerVolumeIcon } from "@/components/audio/PlayerIcons";
import { DynamicModal } from "@/components/ui/dynamic/DynamicModal";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { cn } from "@/lib/cn";
import type { AudioPlayerContextValue, AudioTrack } from "@/lib/audio/types";

function IconButton({ label, active, className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return <button type="button" aria-label={label} title={label} className={cn("audio-control", active && "audio-control-active", className)} {...props}>{children}</button>;
}

function Artwork({ track, className }: { track: AudioTrack; className?: string }) {
  return <span className={cn("audio-artwork", className)}>{track.coverUrl ? <Image src={track.coverUrl} alt="" fill unoptimized sizes="(max-width: 640px) 64px, 240px" /> : <PlayerMusicIcon />}</span>;
}

function PlayButton({ player, large = false }: { player: AudioPlayerContextValue; large?: boolean }) {
  const pendingOrPlaying = player.playing || player.buffering;
  return <span className={cn("audio-play-orbit", large && "audio-play-orbit-large")} data-playing={player.playing} data-buffering={player.buffering}>
    <span className="audio-play-halo" aria-hidden="true" /><span className="audio-play-halo" aria-hidden="true" /><span className="audio-play-halo" aria-hidden="true" />
    <IconButton label={pendingOrPlaying ? "Pause playback" : "Play track"} className={cn("neo-button-accent audio-play-button", large && "audio-play-button-large")} onClick={() => player.buffering ? player.pause() : player.toggle()}>
      {player.buffering ? <PlayerLoaderIcon className="audio-loading" /> : player.playing ? <PlayerPauseIcon /> : <PlayerPlayIcon />}
    </IconButton>
  </span>;
}

function hasNext(player: AudioPlayerContextValue) {
  return player.queue.length > 1 && (player.shuffle || player.repeat === "all" || player.queueIndex < player.queue.length - 1);
}

function Volume({ player, label = false }: { player: AudioPlayerContextValue; label?: boolean }) {
  const id = useId();
  return <div className="audio-volume">
    <IconButton label={player.muted || player.volume === 0 ? "Unmute" : "Mute"} onClick={player.toggleMuted} active={player.muted}><PlayerVolumeIcon muted={player.muted || player.volume === 0} /></IconButton>
    <label className={label ? "audio-volume-label" : "sr-only"} htmlFor={id}>Volume</label>
    <input id={id} aria-valuetext={`${Math.round((player.muted ? 0 : player.volume) * 100)} percent`} type="range" min={0} max={1} step={0.01} value={player.muted ? 0 : player.volume} onChange={(event) => player.setVolume(Number(event.target.value))} style={{ "--audio-volume-level": `${(player.muted ? 0 : player.volume) * 100}%` } as CSSProperties} />
    {label && <span className="audio-volume-value">{Math.round((player.muted ? 0 : player.volume) * 100)}%</span>}
  </div>;
}

function FullControls({ player }: { player: AudioPlayerContextValue }) {
  return <div className="audio-full-controls">
    <div className="audio-sheet-transport">
      <IconButton label="Previous track" onClick={player.previous}><PlayerPreviousIcon /></IconButton>
      <IconButton label="Rewind 10 seconds" onClick={() => player.skip(-10)} disabled={!player.duration}><PlayerSkipIcon /></IconButton>
      <PlayButton player={player} large />
      <IconButton label="Forward 10 seconds" onClick={() => player.skip(10)} disabled={!player.duration}><PlayerSkipIcon forward /></IconButton>
      <IconButton label="Next track" onClick={player.next} disabled={!hasNext(player)}><PlayerNextIcon /></IconButton>
    </div>
    <div className="audio-playback-modes">
      <button type="button" className={cn("audio-mode", player.shuffle && "audio-control-active")} aria-pressed={player.shuffle} onClick={player.toggleShuffle}><PlayerShuffleIcon /><span>Shuffle {player.shuffle ? "on" : "off"}</span></button>
      <button type="button" className={cn("audio-mode", player.repeat !== "off" && "audio-control-active")} aria-label={`Repeat: ${player.repeat}. Change repeat mode`} aria-pressed={player.repeat !== "off"} onClick={player.cycleRepeat}><PlayerRepeatIcon one={player.repeat === "one"} /><span>Repeat {player.repeat === "one" ? "one" : player.repeat === "all" ? "all" : "off"}</span></button>
    </div>
    <Volume player={player} label />
  </div>;
}

function Queue({ player }: { player: AudioPlayerContextValue }) {
  return <section className="audio-queue" aria-labelledby="audio-queue-heading">
    <div className="audio-queue-heading"><h3 id="audio-queue-heading">Play queue</h3><span>{player.queue.length} {player.queue.length === 1 ? "track" : "tracks"}</span></div>
    <ol>{player.queue.map((item, index) => <li key={item.id} className={cn("audio-queue-item", player.track?.id === item.id && "audio-queue-current")}>
      <button type="button" className="audio-queue-track" onClick={() => player.toggle(item, player.queue)} aria-label={`${player.track?.id === item.id && player.playing ? "Pause" : "Play"} ${item.title}`} aria-current={player.track?.id === item.id ? "true" : undefined}>
        <span className="audio-queue-number">{player.track?.id === item.id && player.playing ? <PlayerPauseIcon /> : index + 1}</span>
        <Artwork track={item} />
        <span className="audio-queue-copy"><strong>{item.title}</strong><span>{item.artist}</span></span>
        <span className="audio-queue-kind">{item.durationLimitSeconds ? `${item.durationLimitSeconds}s` : "Full"}</span>
      </button>
      {player.track?.id !== item.id && <IconButton label={`Remove ${item.title} from queue`} className="audio-queue-remove" onClick={() => player.removeFromQueue(item.id)}><PlayerCloseIcon /></IconButton>}
    </li>)}</ol>
    <p className="audio-queue-note">The player stays with you as you explore. Your next track starts automatically.</p>
  </section>;
}

/** Mounted once beside route content, so navigation never remounts the music player. */
export function PlayerDock() {
  const player = useAudioPlayer();
  const [expanded, setExpanded] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const dockRef = useRef<HTMLElement>(null);
  const closeExpanded = useCallback(() => setExpanded(false), []);
  const hasTrack = Boolean(player.track);

  useEffect(() => {
    if (!hasTrack || !dockRef.current) return;
    const dock = dockRef.current;
    function measure() {
      const bottom = Number.parseFloat(getComputedStyle(dock).bottom) || 12;
      const height = dock.getBoundingClientRect().height + bottom + 12;
      document.documentElement.style.setProperty("--audio-player-height", `${Math.ceil(height)}px`);
    }
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(dock);
    window.addEventListener("resize", measure, { passive: true });
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); document.documentElement.style.removeProperty("--audio-player-height"); };
  }, [hasTrack, minimized]);

  if (!player.track) return null;
  const { track } = player;
  const status = player.error ? "Playback unavailable" : player.buffering ? "Connecting…" : player.playing ? "Now playing" : "Paused";
  const type = track.durationLimitSeconds ? `${track.durationLimitSeconds}-second preview` : track.isDemo ? "Full-length demo" : "Full track";

  function stop() { setExpanded(false); setMinimized(false); player.clear(); }

  return <>
    <div className="audio-player-spacer" aria-hidden="true" />
    <aside ref={dockRef} className={cn("audio-dock", minimized && "audio-dock-minimized")} aria-label="Global music player">
      <div className="audio-dock-panel neo-raised-strong" data-playing={player.playing}>
        <div className="audio-dock-aura" aria-hidden="true"><span /><span /><span /></div>
        <div className="audio-dock-main">
          <button type="button" className="audio-now-playing" aria-label={`Open player for ${track.title}`} onClick={() => { setMinimized(false); setExpanded(true); }}>
            <Artwork track={track} />
            <span className="audio-track-copy"><span className="audio-track-title">{track.title}</span><span className="audio-track-artist">{track.artist}</span><span className="audio-track-type">{type}</span></span>
          </button>
          <div className="audio-transport-desktop" aria-label="Playback controls">
            <IconButton label={`Shuffle ${player.shuffle ? "on" : "off"}`} aria-pressed={player.shuffle} active={player.shuffle} onClick={player.toggleShuffle}><PlayerShuffleIcon /></IconButton>
            <IconButton label="Previous track" onClick={player.previous}><PlayerPreviousIcon /></IconButton>
            <PlayButton player={player} />
            <IconButton label="Next track" onClick={player.next} disabled={!hasNext(player)}><PlayerNextIcon /></IconButton>
            <IconButton label={`Repeat ${player.repeat}. Change repeat mode`} aria-pressed={player.repeat !== "off"} active={player.repeat !== "off"} onClick={player.cycleRepeat}><PlayerRepeatIcon one={player.repeat === "one"} /></IconButton>
          </div>
          <div className="audio-transport-mobile">
            <PlayButton player={player} />
            <IconButton label="Next track" onClick={player.next} disabled={!hasNext(player)}><PlayerNextIcon /></IconButton>
            <IconButton label="Open full player" onClick={() => { setMinimized(false); setExpanded(true); }}><PlayerExpandIcon /></IconButton>
          </div>
          <div className="audio-dock-tools">
            <div className="audio-dock-volume"><Volume player={player} /></div>
            <IconButton label={`Open play queue, ${player.queue.length} tracks`} onClick={() => setExpanded(true)}><PlayerQueueIcon /></IconButton>
            <IconButton label={minimized ? "Expand player" : "Minimize player"} onClick={() => setMinimized((value) => !value)}>{minimized ? <PlayerExpandIcon /> : <PlayerCollapseIcon />}</IconButton>
            <IconButton label="Close player and stop playback" onClick={stop}><PlayerCloseIcon /></IconButton>
          </div>
        </div>
        {!minimized && <div className="audio-dock-bottom"><Timeline player={player} visualize={!expanded} /><span className="audio-dock-status" aria-live="polite">{status}</span></div>}
        {player.error && <div className="audio-player-error" role="alert"><span>{player.error}</span><button type="button" onClick={player.retry}>Try again</button></div>}
      </div>
    </aside>

    <DynamicModal open={expanded} onClose={closeExpanded} title="Your listening space" description="Keep the music going, wherever you are on BeatMarketplace." size="lg" presentation="sheet">
      <div className="audio-player-sheet">
        <div className="audio-sheet-current">
          <Artwork track={track} className="audio-sheet-artwork" />
          <div className="audio-sheet-info"><p className="audio-sheet-eyebrow">{status} <span>·</span> {type}</p><h2>{track.title}</h2><p className="audio-sheet-artist">{track.artist}</p>{track.description && <p className="audio-sheet-description">{track.description}</p>}{track.href && <Link href={track.href} onClick={closeExpanded} className="audio-track-link">{track.isDemo ? "Back to listening room →" : "View track & licenses →"}</Link>}</div>
        </div>
        <Timeline player={player} large />
        <FullControls player={player} />
        {player.error && <div className="audio-player-error" role="alert"><span>{player.error}</span><button type="button" onClick={player.retry}>Try again</button></div>}
        <Queue player={player} />
        <div className="audio-sheet-footer"><p>Use Tab to move between controls. Arrow keys adjust sliders.</p><div className="audio-sheet-footer-actions"><NeumorphicButton size="sm" onClick={() => { setMinimized(true); setExpanded(false); }}><PlayerCollapseIcon className="size-4" />Minimize</NeumorphicButton><NeumorphicButton size="sm" variant="quiet" onClick={stop}><PlayerCloseIcon className="size-4" />Stop & close</NeumorphicButton></div></div>
      </div>
    </DynamicModal>
  </>;
}
