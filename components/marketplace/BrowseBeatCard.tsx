"use client";

import { CoverImage } from "@/components/ui/CoverImage";
import Link from "next/link";
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
import { useDiscountActive } from "@/components/discounts/clock";
import { ArrowRightIcon, MusicNoteIcon } from "@/components/ui/icons";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import type { AudioTrack } from "@/lib/audio/types";
import type { MarketplaceTrack } from "@/lib/marketplace/types";
import { marketplaceAudioTrack } from "@/lib/audio/marketplace-track";
import { formatAudioTime } from "@/lib/audio/utils";
import demoWaveforms from "@/lib/audio/demo-waveforms.json";

const demoMetadata: Record<string, { durationSeconds: number }> = demoWaveforms;
type Props = {
  beat?: MarketplaceTrack;
  demo?: AudioTrack;
  queue: AudioTrack[];
};

export function BrowseBeatCard({ beat, demo, queue }: Props) {
  const audio = beat ? marketplaceAudioTrack(beat) : demo!;
  const transport = useAudioTransport();
  const actions = useAudioActions();
  const current = transport.track?.id === audio.id;
  const playing = current && transport.playing;
  const buffering = current && transport.buffering;
  const discount =
    beat?.discount ??
    beat?.licenses.find((license) => license.discount)?.discount;
  const onSale = useDiscountActive(discount);
  const duration =
    beat?.durationSeconds || demoMetadata[audio.id]?.durationSeconds || 0;
  const artwork = audio.coverUrl ? (
    <CoverImage
      className="browse-beat-cover"
      src={audio.coverUrl}
      alt=""
      sizes="(max-width:699px) 46vw, (max-width:1099px) 25vw, 240px"
    />
  ) : (
    <MusicNoteIcon />
  );
  return (
    <article
      className="browse-beat"
      data-playing={playing}
      data-demo={Boolean(demo)}
      data-on-sale={onSale}
      data-track-id={audio.id}
    >
      <div className="browse-beat-art">
        {beat ? (
          <Link
            href={`/tracks/${beat.id}`}
            className="browse-beat-art-link"
            aria-label={`View ${audio.title} and licenses`}
            prefetch={false}
          >
            {artwork}
          </Link>
        ) : (
          <span className="browse-beat-art-link">{artwork}</span>
        )}
        <span className="browse-beat-duration">
          {duration ? formatAudioTime(duration) : "30s"}
        </span>
        {onSale && discount && (
          <span className="browse-beat-sale">{discount.percentage}% off</span>
        )}
        <NeumorphicButton
          variant="accent"
          className="browse-beat-play"
          disabled={!audio.src}
          aria-label={`${playing || buffering ? "Pause" : "Play"} ${audio.title}`}
          title={
            beat
              ? "Listen to the producer-selected 30-second preview"
              : "Listen to the full-length demo"
          }
          aria-pressed={playing || buffering}
          onClick={() => actions.toggle(audio, queue)}
        >
          {buffering ? (
            <PlayerLoaderIcon className="audio-loading" />
          ) : playing ? (
            <PlayerPauseIcon />
          ) : (
            <PlayerPlayIcon />
          )}
        </NeumorphicButton>
      </div>
      <div className="browse-beat-copy">
        <h3>
          {beat ? (
            <Link href={`/tracks/${beat.id}`} prefetch={false}>
              {audio.title}
            </Link>
          ) : (
            audio.title
          )}
        </h3>
        <p className="browse-beat-meta">
          {beat ? `${beat.bpm} BPM · ${beat.musicalKey}` : "Full-length demo"}
        </p>
      </div>
      <div className="browse-beat-actions">
        <AudioFavoriteButton track={audio} className="browse-beat-save" />
        {beat ? (
          <Link
            className="browse-beat-details"
            href={`/tracks/${beat.id}`}
            prefetch={false}
            aria-label={`Licenses and details for ${audio.title}`}
          >
            <ArrowRightIcon />
          </Link>
        ) : (
          <span className="browse-beat-demo-label">Demo</span>
        )}
      </div>
    </article>
  );
}
