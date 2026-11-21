"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
} from "react";

import { useAudioPlayer } from "@/components/audio/AudioPlayerProvider";
import { AudioFavoriteButton } from "@/components/audio/AudioFavoriteButton";
import { TrackSpectrum } from "@/components/audio/TrackSpectrum";
import { PlayerTimeline as Timeline } from "@/components/audio/PlayerTimeline";
import { usePlaybackHalo } from "@/components/audio/usePlaybackHalo";
import {
  PlayerCloseIcon,
  PlayerCollapseIcon,
  PlayerExpandIcon,
  PlayerLoaderIcon,
  PlayerMusicIcon,
  PlayerNextIcon,
  PlayerPauseIcon,
  PlayerPlayIcon,
  PlayerPreviousIcon,
  PlayerQueueIcon,
  PlayerRepeatIcon,
  PlayerShuffleIcon,
  PlayerSkipIcon,
  PlayerVolumeIcon,
} from "@/components/audio/PlayerIcons";
import { DynamicModal } from "@/components/ui/dynamic/DynamicModal";
import {
  NeumorphicButton,
  NeumorphicLink,
  neumorphicButtonClass,
} from "@/components/ui/neumorphic/Button";
import { ScrollingTitle } from "@/components/ui/dynamic/ScrollingTitle";
import { cn } from "@/lib/cn";
import type { AudioPlayerContextValue, AudioTrack } from "@/lib/audio/types";
import { formatAudioTime } from "@/lib/audio/utils";

function IconButton({
  label,
  active,
  className,
  children,
  variant = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
  variant?: "default" | "accent" | "quiet";
}) {
  return (
    <NeumorphicButton
      variant={variant}
      aria-label={label}
      title={label}
      className={cn(
        "audio-control",
        active && "audio-control-active",
        className,
      )}
      {...props}
    >
      {children}
    </NeumorphicButton>
  );
}

function Artwork({
  track,
  className,
}: {
  track: AudioTrack;
  className?: string;
}) {
  return (
    <span className={cn("audio-artwork", className)}>
      {track.coverUrl ? (
        <Image
          src={track.coverUrl}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 640px) 64px, 240px"
        />
      ) : (
        <PlayerMusicIcon />
      )}
    </span>
  );
}

function PlayButton({
  player,
  large = false,
  animate = true,
}: {
  player: AudioPlayerContextValue;
  large?: boolean;
  animate?: boolean;
}) {
  const pendingOrPlaying = player.playing || player.buffering;
  const haloRef = usePlaybackHalo(player.playing && !player.buffering, animate);
  return (
    <span
      ref={haloRef}
      className={cn("audio-play-orbit", large && "audio-play-orbit-large")}
      data-playing={player.playing}
      data-buffering={player.buffering}
    >
      <span className="audio-play-energy" aria-hidden="true">
        <span className="audio-play-halo" />
        <span className="audio-play-halo" />
        <span className="audio-play-halo" />
      </span>
      <IconButton
        variant="accent"
        label={pendingOrPlaying ? "Pause playback" : "Play track"}
        className={cn("audio-play-button", large && "audio-play-button-large")}
        onClick={() => (player.buffering ? player.pause() : player.toggle())}
      >
        {player.buffering ? (
          <PlayerLoaderIcon className="audio-loading" />
        ) : player.playing ? (
          <PlayerPauseIcon />
        ) : (
          <PlayerPlayIcon />
        )}
      </IconButton>
    </span>
  );
}

function hasNext(player: AudioPlayerContextValue) {
  return (
    player.queue.length > 1 &&
    (player.shuffle ||
      player.repeat === "all" ||
      player.queueIndex < player.queue.length - 1)
  );
}

function Volume({
  player,
  label = false,
}: {
  player: AudioPlayerContextValue;
  label?: boolean;
}) {
  const id = useId();
  return (
    <div className="audio-volume">
      <IconButton
        label={player.muted || player.volume === 0 ? "Unmute" : "Mute"}
        onClick={player.toggleMuted}
        active={player.muted}
      >
        <PlayerVolumeIcon muted={player.muted || player.volume === 0} />
      </IconButton>
      <label className={label ? "audio-volume-label" : "sr-only"} htmlFor={id}>
        Volume
      </label>
      <input
        id={id}
        aria-valuetext={`${Math.round((player.muted ? 0 : player.volume) * 100)} percent`}
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={player.muted ? 0 : player.volume}
        onChange={(event) => player.setVolume(Number(event.target.value))}
        style={
          {
            "--audio-volume-level": `${(player.muted ? 0 : player.volume) * 100}%`,
          } as CSSProperties
        }
      />
      {label && (
        <span className="audio-volume-value">
          {Math.round((player.muted ? 0 : player.volume) * 100)}%
        </span>
      )}
    </div>
  );
}

function FullControls({ player }: { player: AudioPlayerContextValue }) {
  return (
    <div className="audio-full-controls">
      <div className="audio-sheet-transport">
        {player.track && (
          <AudioFavoriteButton
            track={player.track}
            className="audio-control audio-sheet-favorite"
          />
        )}
        <IconButton label="Previous track" onClick={player.previous}>
          <PlayerPreviousIcon />
        </IconButton>
        <PlayButton player={player} large />
        <IconButton
          label="Next track"
          onClick={player.next}
          disabled={!hasNext(player)}
        >
          <PlayerNextIcon />
        </IconButton>
        <IconButton
          label={`Repeat ${player.repeat}. Change repeat mode`}
          aria-pressed={player.repeat !== "off"}
          active={player.repeat !== "off"}
          onClick={player.cycleRepeat}
        >
          <PlayerRepeatIcon one={player.repeat === "one"} />
        </IconButton>
      </div>
      <Timeline player={player} large />
      <div className="audio-sheet-secondary">
        <IconButton
          label="Rewind 10 seconds"
          onClick={() => player.skip(-10)}
          disabled={!player.duration}
        >
          <PlayerSkipIcon />
        </IconButton>
        <IconButton
          label={`Shuffle ${player.shuffle ? "on" : "off"}`}
          aria-pressed={player.shuffle}
          active={player.shuffle}
          onClick={player.toggleShuffle}
        >
          <PlayerShuffleIcon />
        </IconButton>
        <Volume player={player} label />
        <IconButton
          label="Forward 10 seconds"
          onClick={() => player.skip(10)}
          disabled={!player.duration}
        >
          <PlayerSkipIcon forward />
        </IconButton>
      </div>
    </div>
  );
}

function ActionIcon({ kind }: { kind: "download" | "details" | "more" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "download" ? (
        <path d="M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5" />
      ) : kind === "details" ? (
        <>
          <path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h5" />
        </>
      ) : (
        <>
          <circle cx="5" cy="12" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
        </>
      )}
    </svg>
  );
}

function Queue({ player }: { player: AudioPlayerContextValue }) {
  return (
    <section className="audio-queue" aria-labelledby="audio-queue-heading">
      <div className="audio-queue-heading">
        <h3 id="audio-queue-heading">Play queue</h3>
        <span>
          {player.queue.length} {player.queue.length === 1 ? "track" : "tracks"}
        </span>
      </div>
      <ol>
        {player.queue.map((item, index) => (
          <li
            key={item.id}
            className={cn(
              "audio-queue-item",
              player.track?.id === item.id && "audio-queue-current",
            )}
          >
            <button
              type="button"
              className="audio-queue-track"
              onClick={() => player.toggle(item, player.queue)}
              aria-label={`${player.track?.id === item.id && player.playing ? "Pause" : "Play"} ${item.title}`}
              aria-current={player.track?.id === item.id ? "true" : undefined}
            >
              <span className="audio-queue-number">
                {player.track?.id === item.id && player.playing ? (
                  <PlayerPauseIcon />
                ) : (
                  index + 1
                )}
              </span>
              <Artwork track={item} />
              <span className="audio-queue-copy">
                <strong>{item.title}</strong>
                <span>{item.artist}</span>
              </span>
              <span className="audio-queue-kind">
                {item.durationLimitSeconds
                  ? `${item.durationLimitSeconds}s`
                  : "Full"}
              </span>
            </button>
            {player.track?.id !== item.id && (
              <IconButton
                label={`Remove ${item.title} from queue`}
                className="audio-queue-remove"
                onClick={() => player.removeFromQueue(item.id)}
              >
                <PlayerCloseIcon />
              </IconButton>
            )}
          </li>
        ))}
      </ol>
      <p className="audio-queue-note">
        The player stays with you as you explore. Your next track starts
        automatically.
      </p>
    </section>
  );
}

function ListeningOptions({ player, status }: { player: AudioPlayerContextValue; status: string }) {
  const message = player.offline ? "You’re offline. Reconnect to load audio."
    : player.error || (player.slowConnection ? "Your connection is slow. Try lower-data audio." : player.buffering ? (player.elapsed > 0 ? "Buffering audio…" : "Loading audio…") : status);
  return <div className="audio-listening-options">
    <span role="status" aria-live="polite">{message}</span>
    <div className="audio-listening-option-actions">
      {player.track?.lowDataSrc && <NeumorphicButton size="sm" variant="quiet" aria-pressed={player.quality === "data-saver"}
        aria-label={player.quality === "data-saver" ? "Use standard audio" : "Use lower-data audio"}
        onClick={() => player.setQuality(player.quality === "data-saver" ? "standard" : "data-saver")}>
        Data saver {player.quality === "data-saver" ? "on" : "off"}
      </NeumorphicButton>}
      {(player.error || player.slowConnection) && <NeumorphicButton size="sm" variant="quiet" disabled={player.offline} onClick={player.retry}>Retry audio</NeumorphicButton>}
    </div>
  </div>;
}

/** Mounted once beside route content, so navigation never remounts the music player. */
export function PlayerDock() {
  const player = useAudioPlayer();
  const [expanded, setExpanded] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [showQueue, setShowQueue] = useState(false),
    [showMore, setShowMore] = useState(false);
  const queueId = useId(),
    moreId = useId();
  const dockRef = useRef<HTMLElement>(null);
  const closeExpanded = useCallback(() => {
    setExpanded(false);
    setShowQueue(false);
    setShowMore(false);
  }, []);
  const hasTrack = Boolean(player.track);

  useEffect(() => {
    if (!hasTrack || !dockRef.current) return;
    const dock = dockRef.current;
    function measure() {
      const bottom = Number.parseFloat(getComputedStyle(dock).bottom) || 12;
      const height = dock.getBoundingClientRect().height + bottom + 12;
      document.documentElement.style.setProperty(
        "--audio-player-height",
        `${Math.ceil(height)}px`,
      );
    }
    measure();
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    observer?.observe(dock);
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      document.documentElement.style.removeProperty("--audio-player-height");
    };
  }, [hasTrack, minimized]);

  if (!player.track) return null;
  const { track } = player;
  const status = player.error
    ? "Playback unavailable"
    : player.buffering
      ? "Connecting…"
      : player.playing
        ? "Now playing"
        : "Paused";
  const type = track.durationLimitSeconds
    ? `${track.durationLimitSeconds}-second preview`
    : track.isDemo
      ? "Full-length demo"
      : "Full track";

  function stop() {
    closeExpanded();
    setMinimized(false);
    player.clear();
  }
  function openPlayer(queue = false) {
    setMinimized(false);
    setShowQueue(queue);
    setShowMore(false);
    setExpanded(true);
  }

  return (
    <>
      <div className="audio-player-spacer" aria-hidden="true" />
      <aside
        ref={dockRef}
        className={cn("audio-dock", minimized && "audio-dock-minimized")}
        data-expanded={expanded}
        inert={expanded}
        aria-label="Global music player"
      >
        <div
          className="audio-dock-panel neo-raised-strong"
          data-playing={player.playing}
        >
          <div className="audio-dock-main">
            <NeumorphicButton
              variant="quiet"
              className="audio-now-playing"
              aria-label={`Open player for ${track.title}`}
              aria-haspopup="dialog"
              onClick={() => openPlayer()}
            >
              <Artwork track={track} />
              <span className="audio-track-copy">
                <span className="audio-track-heading">
                  <span className="audio-track-title">
                    <ScrollingTitle text={track.title} />
                  </span>
                  <PlayerExpandIcon className="audio-open-player-hint" />
                </span>
                <span className="audio-track-artist">{track.artist}</span>
                <span className="audio-track-type">{type}</span>
              </span>
            </NeumorphicButton>
            <AudioFavoriteButton
              track={track}
              className="audio-control audio-dock-favorite"
            />
            <div
              className="audio-transport-desktop"
              aria-label="Playback controls"
            >
              <IconButton
                label={`Shuffle ${player.shuffle ? "on" : "off"}`}
                aria-pressed={player.shuffle}
                active={player.shuffle}
                onClick={player.toggleShuffle}
              >
                <PlayerShuffleIcon />
              </IconButton>
              <IconButton label="Previous track" onClick={player.previous}>
                <PlayerPreviousIcon />
              </IconButton>
              <PlayButton player={player} animate={!expanded} />
              <IconButton
                label="Next track"
                onClick={player.next}
                disabled={!hasNext(player)}
              >
                <PlayerNextIcon />
              </IconButton>
              <IconButton
                label={`Repeat ${player.repeat}. Change repeat mode`}
                aria-pressed={player.repeat !== "off"}
                active={player.repeat !== "off"}
                onClick={player.cycleRepeat}
              >
                <PlayerRepeatIcon one={player.repeat === "one"} />
              </IconButton>
            </div>
            <div className="audio-transport-mobile">
              <PlayButton player={player} animate={!expanded} />
              <IconButton
                label="Next track"
                onClick={player.next}
                disabled={!hasNext(player)}
              >
                <PlayerNextIcon />
              </IconButton>
            </div>
            <span className="audio-dock-time" aria-hidden="true">
              {formatAudioTime(player.elapsed)} <span>/</span>{" "}
              {player.duration ? formatAudioTime(player.duration) : "–:––"}
            </span>
            <div className="audio-dock-tools">
              <div className="audio-dock-volume">
                <Volume player={player} />
              </div>
              <IconButton
                label={minimized ? "Expand player" : "Minimize player"}
                onClick={() => setMinimized((value) => !value)}
              >
                {minimized ? <PlayerExpandIcon /> : <PlayerCollapseIcon />}
              </IconButton>
            </div>
            <IconButton
              className="audio-dock-close"
              label="Close player and stop playback"
              onClick={stop}
            >
              <PlayerCloseIcon />
            </IconButton>
          </div>
          {!minimized && (
            <div className="audio-dock-bottom">
              <Timeline player={player} visualize={!expanded} />
            </div>
          )}
          <span className="sr-only" role="status" aria-live="polite">
            {status}
          </span>
          <ListeningOptions player={player} status={status} />
        </div>
      </aside>

      <DynamicModal
        open={expanded}
        onClose={closeExpanded}
        title="Your listening space"
        size="lg"
        presentation="sheet"
        className="audio-listening-modal"
      >
        <div className="audio-player-sheet">
          <div className="audio-sheet-current">
            <div className="audio-sheet-stage">
              <div className="audio-sheet-spectrum" aria-hidden="true">
                <TrackSpectrum
                  trackId={track.id}
                  variant="bars"
                  preserveOnPause
                />
              </div>
              <Artwork track={track} className="audio-sheet-artwork" />
            </div>
            <div className="audio-sheet-info">
              <p className="audio-sheet-eyebrow">
                {status} <span>·</span> {type}
              </p>
              <h2 aria-label={track.title}>
                <ScrollingTitle text={track.title} />
              </h2>
              <p className="audio-sheet-artist">{track.artist}</p>
            </div>
          </div>
          <FullControls player={player} />
          <div className="audio-sheet-actions">
            <NeumorphicButton
              className="audio-sheet-action"
              aria-expanded={showQueue}
              aria-controls={queueId}
              onClick={() => {
                setShowQueue((value) => !value);
                setShowMore(false);
              }}
            >
              <PlayerQueueIcon add={false} />
              <span>
                Queue{" "}
                <span className="audio-sheet-action-count">
                  {player.queue.length}
                </span>
              </span>
            </NeumorphicButton>
            {track.isDemo ? (
              <a
                href={track.downloadSrc || track.src}
                download
                className={cn(neumorphicButtonClass(), "audio-sheet-action")}
              >
                <ActionIcon kind="download" />
                <span>Download demo</span>
              </a>
            ) : (
              <NeumorphicLink
                href={track.href || "/dashboard/downloads"}
                className="audio-sheet-action"
                onClick={closeExpanded}
              >
                <ActionIcon kind="details" />
                <span>{track.href ? "View licenses" : "My downloads"}</span>
              </NeumorphicLink>
            )}
            <NeumorphicButton
              className="audio-sheet-action"
              aria-expanded={showMore}
              aria-controls={moreId}
              onClick={() => {
                setShowMore((value) => !value);
                setShowQueue(false);
              }}
            >
              <ActionIcon kind="more" />
              <span>More</span>
            </NeumorphicButton>
          </div>
          <ListeningOptions player={player} status={status} />
          {showQueue && (
            <div id={queueId} className="audio-queue-panel">
              <Queue player={player} />
            </div>
          )}
          {showMore && (
            <div id={moreId} className="audio-sheet-more">
              {track.description && (
                <p className="audio-sheet-description">{track.description}</p>
              )}
              {track.href && (
                <Link
                  href={track.href}
                  onClick={closeExpanded}
                  className="audio-track-link"
                >
                  {track.isDemo
                    ? "Back to listening room →"
                    : "View track & licenses →"}
                </Link>
              )}
              <div className="audio-sheet-footer">
                <p>
                  Use Tab to move between controls. Arrow keys adjust sliders.
                </p>
                <div className="audio-sheet-footer-actions">
                  <NeumorphicButton
                    size="sm"
                    onClick={() => {
                      setMinimized(true);
                      closeExpanded();
                    }}
                  >
                    <PlayerCollapseIcon className="size-4" />
                    Minimize
                  </NeumorphicButton>
                  <NeumorphicButton size="sm" variant="quiet" onClick={stop}>
                    <PlayerCloseIcon className="size-4" />
                    Stop & close
                  </NeumorphicButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </DynamicModal>
    </>
  );
}
