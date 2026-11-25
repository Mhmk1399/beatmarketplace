"use client";

import Image from "next/image";
import Link from "next/link";
import { CoverImage } from "@/components/ui/CoverImage";
import { AudioFavoriteButton } from "@/components/audio/AudioFavoriteButton";
import {
  useAudioActions,
  useAudioTransport,
} from "@/components/audio/AudioPlayerProvider";
import {
  PlayerLoaderIcon,
  PlayerPauseIcon,
  PlayerPlayIcon,
} from "@/components/audio/PlayerIcons";
import { TrackSpectrum } from "@/components/audio/TrackSpectrum";
import { ArrowRightIcon } from "@/components/ui/icons";
import {
  NeumorphicButton,
  NeumorphicLink,
} from "@/components/ui/neumorphic/Button";
import { marketplaceAudioTrack } from "@/lib/audio/marketplace-track";
import { formatAudioTime } from "@/lib/audio/utils";
import { trackHref } from "@/lib/marketplace/track-url";
import type { MarketplaceTrack } from "@/lib/marketplace/types";

function Waveform({ trackId, playing }: { trackId: string; playing: boolean }) {
  return (
    <div
      className="trending-waveform"
      data-playing={playing}
      aria-hidden="true"
    >
      {playing ? <TrackSpectrum trackId={trackId} variant="bars" /> : (
        <svg className="trending-waveform-preview" viewBox="0 0 256 48" preserveAspectRatio="none">
          <line x1="2" y1="24" x2="254" y2="24" strokeDasharray="1 4" />
        </svg>
      )}
    </div>
  );
}

function ParticleWave() {
  return (
    <svg
      className="trending-particle-wave"
      viewBox="0 0 1280 200"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {Array.from({ length: 20 }, (_, index) => {
        const y = 80 + index * 4;
        return (
          <path
            key={index}
            d={`M-80 ${y - 70} C80 ${y + 150}, 260 ${y - 140}, 480 ${y - 44} S760 ${y + 110}, 990 ${y + 18} S1190 ${y - 40}, 1360 ${y + 70}`}
          />
        );
      })}
    </svg>
  );
}

export function TrendingBeats({ tracks, headphonesUrl }: { tracks: MarketplaceTrack[]; headphonesUrl: string | null }) {
  const transport = useAudioTransport();
  const actions = useAudioActions();
  const selections = tracks.filter(beat => beat.previewUrl).slice(0, 4).map(beat => ({ beat, track: marketplaceAudioTrack(beat) }));
  const queue = selections.map(({ track }) => track);

  return (
    <section
      id="trending-beats"
      className="music-home-section trending-section"
      aria-labelledby="trending-beats-title"
    >
      <div className="music-home-container">
        <div className="trending-panel">
          <ParticleWave />
          {headphonesUrl && <div className="trending-headphones" aria-hidden="true">
            <Image
              src={headphonesUrl}
              alt=""
              width={640}
              height={616}
              sizes="(max-width: 699px) 150px, (max-width: 999px) 200px, 300px"
              draggable={false}
              unoptimized
            />
          </div>}
          <header className="trending-intro">
            <p className="trending-kicker">Listening picks</p>
            <h2 id="trending-beats-title">
              Find your
              <br />
              <span>next vibe.</span>
            </h2>
            <p className="trending-description">
              Hear original beats through 30-second previews chosen by their producers.
            </p>
          </header>
          <NeumorphicLink
            href="/marketplace"
            variant="accent"
            size="sm"
            className="trending-explore"
          >
            <PlayerPlayIcon /> Explore all beats <ArrowRightIcon />
          </NeumorphicLink>
          {selections.length ? <ol
            className="trending-playlist"
            aria-label="Listening picks with previews"
          >
            {selections.map(({ beat, track }) => {
              const current = transport.track?.id === track.id;
              const playing = current && transport.playing;
              const buffering = current && transport.buffering;
              const duration = formatAudioTime(beat.durationSeconds);
              return (
                <li
                  key={track.id}
                  className="trending-track"
                  data-track-id={track.id}
                  data-playing={playing}
                >
                  <div className="trending-track-cover">
                    <CoverImage src={track.coverUrl ?? ""} alt="" sizes="(max-width: 699px) 48px, 72px" />
                  </div>
                  <div className="trending-track-copy">
                    <h3><Link href={trackHref(beat)}>{track.title}</Link></h3>
                    <p>
                      {track.artist} <span aria-hidden="true">·</span> {beat.bpm} BPM
                    </p>
                  </div>
                  <Waveform
                    trackId={track.id}
                    playing={playing && !buffering}
                  />
                  <span
                    className="trending-track-duration"
                    aria-label={`Full beat duration ${duration}`}
                  >
                    {duration}
                  </span>
                  <NeumorphicButton
                    variant="accent"
                    className="trending-track-play"
                    aria-label={`${playing || buffering ? "Pause" : "Play"} preview for ${track.title}`}
                    aria-pressed={playing || buffering}
                    onClick={() => actions.toggle(track, queue)}
                  >
                    {buffering ? (
                      <PlayerLoaderIcon className="trending-loader" />
                    ) : playing ? (
                      <PlayerPauseIcon />
                    ) : (
                      <PlayerPlayIcon />
                    )}
                  </NeumorphicButton>
                  <AudioFavoriteButton
                    track={track}
                    icon="bookmark"
                    className="trending-track-save"
                  />
                </li>
              );
            })}
          </ol> : <div className="trending-playlist p-5 text-sm text-muted">New listening picks will appear as producers publish beats.</div>}
        </div>
      </div>
    </section>
  );
}
