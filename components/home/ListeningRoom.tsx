"use client";

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
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { demoTracks } from "@/lib/audio/demo-tracks";
import type { AudioTrack } from "@/lib/audio/types";

function DemoTimeline({ track }: { track: AudioTrack }) {
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
            <span>Full-length demo</span>
            <span>MP3</span>
          </div>
        </>
      )}
    </div>
  );
}

function DemoQueueButton({ track }: { track: AudioTrack }) {
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

export function ListeningRoom() {
  const { track: current, playing, buffering } = useAudioTransport();
  const actions = useAudioActions();
  const id = useId();
  const { viewportRef, position, move, keyboard, pointerDown, pointerMove, finishDrag } = useLoopCarousel(demoTracks.length);
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
            Full-length listening demos, not for sale.
            <br />
            Keep the music going as you explore.
          </p>
        </header>
        <div
          className="music-room-carousel"
          role="region"
          aria-roledescription="carousel"
          aria-label="Listening sessions"
        >
          <NeumorphicButton
            className="music-room-arrow music-room-arrow-previous"
            aria-label="Previous listening sessions"
            aria-controls={id}
            disabled={demoTracks.length < 2}
            onClick={() => move(-1)}
          >
            <Chevron previous />
          </NeumorphicButton>
          <div
            ref={viewportRef}
            id={id}
            className="music-room-viewport"
            tabIndex={0}
            aria-label="Listening tracks. Use left and right arrow keys to browse."
            onKeyDown={keyboard}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            onLostPointerCapture={finishDrag}
          >
            {[0, 1, 2].flatMap((copy) => demoTracks.map((track, index) => ({ track, index, slot: copy * demoTracks.length + index }))).map(({ track, index, slot }) => {
              const active = current?.id === track.id;
              const isPlaying = active && playing;
              const isBuffering = active && buffering;
              return (
                <article
                  key={slot}
                  data-carousel-item={slot}
                  inert={slot < position.from || slot > position.to}
                  aria-hidden={slot < position.from || slot > position.to}
                  className="music-room-card"
                  data-selected={active}
                  data-playing={isPlaying}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={
                    String(index + 1) +
                    " of " +
                    demoTracks.length +
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
                        "Full track"
                      )}
                    </span>
                  </div>
                  <div className="music-room-card-body">
                    <div className="music-room-artwork">
                      {track.coverUrl && (
                        <CoverImage
                          src={track.coverUrl}
                          alt={track.title + " cover artwork"}
                          draggable={false}
                          sizes="(max-width:599px) 80vw, (max-width:999px) 280px, 240px"
                          className="object-cover"
                        />
                      )}
                      <NeumorphicButton
                        variant="accent"
                        onClick={() => actions.toggle(track, demoTracks)}
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
                      <p className="music-room-overline">
                        Original audio{" "}
                        <span aria-hidden="true">
                          {String.fromCharCode(183)}
                        </span>{" "}
                        Demo
                      </p>
                      <h3>{track.title}</h3>
                      <p className="music-room-description">
                        {track.description}
                      </p>
                      <DemoTimeline track={track} />
                      <div className="music-room-controls">
                        <NeumorphicButton
                          variant="accent"
                          size="sm"
                          onClick={() => actions.toggle(track, demoTracks)}
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
                        <DemoQueueButton track={track} />
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
            disabled={demoTracks.length < 2}
            onClick={() => move(1)}
          >
            <Chevron />
          </NeumorphicButton>
        </div>
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          Listening sessions: {Array.from({ length: position.visible }, (_, index) => demoTracks[(position.first + index) % demoTracks.length].title).join(" and ")}.
        </p>
      </div>
    </section>
  );
}
