"use client";

import Link from "next/link";
import { CoverImage } from "@/components/ui/CoverImage";
import { AudioFavoriteButton } from "@/components/audio/AudioFavoriteButton";
import { useLoopCarousel } from "@/components/ui/dynamic/useLoopCarousel";
import { useId } from "react";
import {
  useAudioActions,
  useAudioPlayer,
  useAudioTransport,
} from "@/components/audio/AudioPlayerProvider";
import {
  PlayerLoaderIcon,
  PlayerPauseIcon,
  PlayerQueueIcon,
} from "@/components/audio/PlayerIcons";
import { PlayerTimeline } from "@/components/audio/PlayerTimeline";
import { TrackSpectrum } from "@/components/audio/TrackSpectrum";
import { DiscIcon, PlayIcon } from "@/components/ui/icons";
import { NeumorphicButton, NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { marketplaceAudioTrack } from "@/lib/audio/marketplace-track";
import type { AudioTrack } from "@/lib/audio/types";
import { formatAudioTime } from "@/lib/audio/utils";
import { trackHref } from "@/lib/marketplace/track-url";
import type { MarketplaceTrack } from "@/lib/marketplace/types";

function PreviewTimeline({ track }: { track: AudioTrack }) {
  const player = useAudioPlayer();
  const current = player.track?.id === track.id;
  return (
    <div className="music-room-timeline">
      {current ? (
        <PlayerTimeline player={player} />
      ) : (
        <>
          <div className="music-room-idle-spectrum">
            <TrackSpectrum trackId={track.id} variant="bars" />
          </div>
          <div className="music-room-timeline-label">
            <span>Producer preview</span>
            <span>{formatAudioTime(track.durationLimitSeconds ?? 30)}</span>
          </div>
        </>
      )}
    </div>
  );
}

function PreviewQueueButton({ track }: { track: AudioTrack }) {
  const player = useAudioPlayer();
  const inQueue = player.queue.some((item) => item.id === track.id);
  return (
    <NeumorphicButton
      size="sm"
      className="music-room-queue"
      onClick={() => player.enqueue(track)}
      disabled={inQueue}
      aria-label={
        inQueue
          ? track.title + " is in the queue"
          : "Add " + track.title + " to queue"
      }
    >
      <PlayerQueueIcon className="size-4" />
      {inQueue ? "In queue" : "Add to queue"}
    </NeumorphicButton>
  );
}

function Chevron({ previous = false }: { previous?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={previous ? "m14 6-6 6 6 6" : "m10 6 6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ListeningRoom({ tracks }: { tracks: MarketplaceTrack[] }) {
  const { track: current, playing, buffering } = useAudioTransport();
  const actions = useAudioActions();
  const id = useId();
  const entries = tracks.filter(beat => beat.previewUrl).slice(0, 5).map(beat => ({ beat, track: marketplaceAudioTrack(beat) }));
  const queue = entries.map(({ track }) => track);
  const count = queue.length;
  const looping = count > 1;
  const { viewportRef, position, move, keyboard, pointerDown, pointerMove, finishDrag } = useLoopCarousel(looping ? count : 0);
  const slots = (looping ? [0, 1, 2] : [0]).flatMap(copy => entries.map((entry, index) => ({ ...entry, index, slot: copy * count + index })));
  return (
    <section
      id="listening-room"
      aria-labelledby="listening-room-title"
      className="music-room music-home-section"
    >
      <div className="music-home-container">
        <header className="music-home-section-heading">
          <div>
            <p className="music-home-kicker">
              The listening room <span aria-hidden="true">/</span> Vol. 01
            </p>
            <h2 id="listening-room-title">Press play. Stay a while.</h2>
          </div>
          <p>
            Listen to previews selected by the producers.
            <br />
            Keep the music going as you explore.
          </p>
        </header>
        {count ? <div
          className="music-room-carousel"
          role="region"
          aria-roledescription="carousel"
          aria-label="Listening sessions"
        >
          <NeumorphicButton
            className="music-room-arrow music-room-arrow-previous"
            aria-label="Previous listening sessions"
            aria-controls={id}
            disabled={!looping}
            onClick={() => move(-1, position.visible === count ? 1 : position.visible)}
          >
            <Chevron previous />
          </NeumorphicButton>
          <div
            ref={viewportRef}
            id={id}
            className={`music-room-viewport${looping ? "" : " justify-center"}`}
            tabIndex={looping ? 0 : undefined}
            aria-label={looping ? "Listening tracks. Use left and right arrow keys to browse." : undefined}
            onKeyDown={looping ? keyboard : undefined}
            onPointerDown={looping ? pointerDown : undefined}
            onPointerMove={looping ? pointerMove : undefined}
            onPointerUp={looping ? finishDrag : undefined}
            onPointerCancel={looping ? finishDrag : undefined}
            onLostPointerCapture={looping ? finishDrag : undefined}
          >
            {slots.map(({ beat, track, index, slot }) => {
              const active = current?.id === track.id;
              const isPlaying = active && playing;
              const isBuffering = active && buffering;
              const hidden = looping && (slot < position.from || slot > position.to);
              return (
                <article
                  key={slot}
                  data-carousel-item={slot}
                  inert={hidden}
                  aria-hidden={hidden}
                  className="music-room-card"
                  data-selected={active}
                  data-playing={isPlaying}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={
                    String(index + 1) +
                    " of " +
                    count +
                    ": " +
                    track.title
                  }
                >
                  <div className="music-room-card-top">
                    <span>
                      <DiscIcon className="size-3.5" /> Listening session{" "}
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="music-room-state">
                      {isPlaying ? (
                        <>
                          <span
                            className="music-status-dot"
                            aria-hidden="true"
                          />{" "}
                          Now playing
                        </>
                      ) : isBuffering ? (
                        "Loading audio"
                      ) : (
                        "30s preview"
                      )}
                    </span>
                  </div>
                  <div className="music-room-card-body">
                    <div className="music-room-artwork">
                      <CoverImage
                        src={track.coverUrl ?? ""}
                        alt={track.title + " cover artwork"}
                        sizes="(max-width:599px) 80vw, (max-width:999px) 280px, 240px"
                      />
                      <NeumorphicButton
                        variant="accent"
                        onClick={() => actions.toggle(track, queue)}
                        aria-label={
                          (isPlaying ? "Pause " : "Play ") + track.title
                        }
                        className="music-room-artwork-play !p-0"
                      >
                        {isBuffering ? (
                          <PlayerLoaderIcon className="music-room-loader size-5" />
                        ) : isPlaying ? (
                          <PlayerPauseIcon className="size-5" />
                        ) : (
                          <PlayIcon className="size-5" />
                        )}
                      </NeumorphicButton>
                    </div>
                    <div className="music-room-copy">
                      <p className="music-room-overline truncate">
                        {track.artist} <span aria-hidden="true">·</span> {beat.bpm} BPM
                      </p>
                      <h3><Link href={trackHref(beat)}>{track.title}</Link></h3>
                      <p className="music-room-description">
                        {track.description || `${beat.genre?.name || "Original beat"} · ${beat.musicalKey}`}
                      </p>
                      {hidden ? <div className="music-room-timeline" /> : <PreviewTimeline track={track} />}
                      <div className="music-room-controls">
                        <NeumorphicButton
                          variant="accent"
                          size="sm"
                          onClick={() => actions.toggle(track, queue)}
                          aria-label={
                            (isPlaying ? "Pause " : "Play ") + track.title
                          }
                        >
                          {isPlaying ? (
                            <PlayerPauseIcon className="size-4" />
                          ) : (
                            <PlayIcon className="size-4" />
                          )}
                          {isPlaying ? "Pause" : "Listen now"}
                        </NeumorphicButton>
                        <PreviewQueueButton track={track} />
                        <AudioFavoriteButton track={track} className="music-room-favorite" />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <NeumorphicButton
            className="music-room-arrow music-room-arrow-next"
            aria-label="Next listening sessions"
            aria-controls={id}
            disabled={!looping}
            onClick={() => move(1, position.visible === count ? 1 : position.visible)}
          >
            <Chevron />
          </NeumorphicButton>
        </div> : <div className="neo-raised mt-6 space-y-3 rounded-[var(--radius-card)] p-5">
          <p className="text-sm text-muted">Listening previews will appear here as producers publish beats.</p>
          <NeumorphicLink href="/marketplace" size="sm">Browse beats</NeumorphicLink>
        </div>}
        {count > 0 && <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          Listening sessions: {Array.from({ length: Math.min(position.visible, count) }, (_, index) => queue[(position.first + index) % count].title).join(" and ")}.
        </p>}
      </div>
    </section>
  );
}
