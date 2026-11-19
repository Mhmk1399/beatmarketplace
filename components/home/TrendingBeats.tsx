"use client";

import Image from "next/image";
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
import { demoTracks } from "@/lib/audio/demo-tracks";
import demoWaveforms from "@/lib/audio/demo-waveforms.json";
import { formatAudioTime } from "@/lib/audio/utils";

// These are editorial demo selections, without invented play counts or sales rankings.
const selections = demoTracks.slice(0, 4);
const waveforms: Record<string, { durationSeconds: number; peaks: number[] }> =
  demoWaveforms;

function Waveform({ trackId, playing }: { trackId: string; playing: boolean }) {
  const peaks = waveforms[trackId]?.peaks;
  return (
    <div
      className="trending-waveform"
      data-playing={playing}
      aria-hidden="true"
    >
      {peaks && (
        <svg
          className="trending-waveform-preview"
          viewBox="0 0 256 48"
          preserveAspectRatio="none"
        >
          {peaks.map((peak, index) => {
            const height = Math.max(2, peak * 38);
            return (
              <line
                key={index}
                x1={index * 4 + 2}
                x2={index * 4 + 2}
                y1={24 - height / 2}
                y2={24 + height / 2}
              />
            );
          })}
        </svg>
      )}
      {playing && <TrackSpectrum trackId={trackId} variant="bars" />}
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

export function TrendingBeats() {
  const transport = useAudioTransport();
  const actions = useAudioActions();

  return (
    <section
      id="trending-beats"
      className="music-home-section trending-section"
      aria-labelledby="trending-beats-title"
    >
      <div className="music-home-container">
        <div className="trending-panel">
          <ParticleWave />
          <div className="trending-headphones" aria-hidden="true">
            <Image
              src="/assets/images/trending-headphones.webp"
              alt=""
              width={640}
              height={616}
              sizes="(max-width: 699px) 150px, (max-width: 999px) 200px, 300px"
              draggable={false}
            />
          </div>
          <header className="trending-intro">
            <p className="trending-kicker">Listening picks</p>
            <h2 id="trending-beats-title">
              Find your
              <br />
              <span>next vibe.</span>
            </h2>
            <p className="trending-description">
              A handpicked listening selection. Full-length demos to explore the
              player, not offered for sale.
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
          <ol
            className="trending-playlist"
            aria-label="Curated listening demos"
          >
            {selections.map((track) => {
              const current = transport.track?.id === track.id;
              const playing = current && transport.playing;
              const buffering = current && transport.buffering;
              return (
                <li
                  key={track.id}
                  className="trending-track"
                  data-track-id={track.id}
                  data-playing={playing}
                >
                  <div className="trending-track-cover">
                    {track.coverUrl && (
                      <Image
                        src={track.coverUrl}
                        alt=""
                        fill
                        unoptimized
                        sizes="(max-width: 699px) 48px, 72px"
                        draggable={false}
                      />
                    )}
                  </div>
                  <div className="trending-track-copy">
                    <h3>{track.title}</h3>
                    <p>
                      Full-length demo <span aria-hidden="true">·</span> MP3
                    </p>
                  </div>
                  <Waveform
                    trackId={track.id}
                    playing={playing && !buffering}
                  />
                  <span
                    className="trending-track-duration"
                    aria-label={`Duration ${formatAudioTime(waveforms[track.id]?.durationSeconds ?? 0)}`}
                  >
                    {formatAudioTime(waveforms[track.id]?.durationSeconds ?? 0)}
                  </span>
                  <NeumorphicButton
                    variant="accent"
                    className="trending-track-play"
                    aria-label={`${playing || buffering ? "Pause" : "Play"} trending beat ${track.title}`}
                    aria-pressed={playing || buffering}
                    onClick={() => actions.toggle(track, demoTracks)}
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
          </ol>
        </div>
      </div>
    </section>
  );
}
