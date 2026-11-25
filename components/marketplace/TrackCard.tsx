"use client";

import Link from "next/link";
import { CoverImage } from "@/components/ui/CoverImage";
import { trackHref } from "@/lib/marketplace/track-url";
import { ArrowRightIcon, MusicNoteIcon, PlayIcon } from "@/components/ui/icons";
import { PlayerPauseIcon } from "@/components/audio/PlayerIcons";
import { useMarketplace } from "@/components/marketplace/MarketplaceProvider";
import type { MarketplaceTrack } from "@/lib/marketplace/types";
import { DiscountCountdown } from "@/components/discounts/DiscountCountdown";
import { LicensePrice } from "@/components/discounts/LicensePrice";
import { useDiscountActive } from "@/components/discounts/clock";

export function TrackCard({ track, queue }: { track: MarketplaceTrack; queue?: MarketplaceTrack[] }) {
  const player = useMarketplace();
  const active = player.track?.id === track.id && player.playing;
  const saved = player.favoriteIds.has(track.id);
  const discount = track.discount ?? track.licenses.find((license) => license.discount)?.discount;
  const onSale = useDiscountActive(discount);
  const cheapest = [...track.licenses].sort((a, b) => Number(a.originalPrice ?? a.price) - Number(b.originalPrice ?? b.price))[0];

  return (
    <article className="music-track-card group" data-playing={active || undefined}>
      <div className="music-track-cover">
        <Link href={trackHref(track)} className="music-track-art-link" aria-label={`View ${track.title} and licenses`}>
          {track.artworkUrl ? <CoverImage src={track.artworkUrl} alt={`Artwork for ${track.title}`} sizes="(max-width:640px) 90vw, (max-width:1024px) 45vw, 25vw" /> : <div className="artwork-nocturne flex h-full items-center justify-center"><MusicNoteIcon className="size-20 text-accent-text" /></div>}
        </Link>
        <div className="music-track-shade" aria-hidden="true" />
        {onSale && discount && <span className="discount-artwork-badge"><span aria-hidden="true">✦</span> {discount.percentage}% OFF</span>}
        <button type="button" aria-label={`${saved ? "Unsave" : "Save"} ${track.title}`} aria-pressed={saved} onClick={() => void player.favorite(track.id)} className="music-track-save">
          <svg viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20.3 5.8a5 5 0 0 0-7.1 0L12 7l-1.2-1.2a5 5 0 0 0-7.1 7.1L12 21l8.3-8.1a5 5 0 0 0 0-7.1Z" /></svg>
        </button>
        <span className="music-track-preview">{active ? <><span className="music-mini-levels" aria-hidden="true"><i /><i /><i /><i /></span> Playing preview</> : <><MusicNoteIcon className="size-3.5" /> {track.previewUrl ? "30s preview" : "Preview coming soon"}</>}</span>
        <button type="button" disabled={!track.previewUrl} onClick={() => player.toggle(track, queue)} aria-label={`${active ? "Pause" : "Play"} ${track.title}`} className="neo-button neo-button-accent music-track-play">
          {active ? <PlayerPauseIcon className="size-5" /> : <PlayIcon className="size-6" />}
        </button>
      </div>
      <div className="music-track-info">
        <p className="music-track-genre">{track.genre?.name || "Original beat"}{track.explicit ? " · Explicit" : ""}</p>
        <h3><Link href={trackHref(track)} className="music-track-title">{track.title}</Link></h3>
        <p className="music-track-producer">{track.producerName}</p>
        <div className="music-track-metadata"><span>{track.bpm} <small>BPM</small></span><span>{track.musicalKey}</span></div>
        {onSale && discount && <DiscountCountdown discount={discount} compact />}
        <Link href={trackHref(track)} className="music-track-license">
          <span className="music-track-license-label">View licenses <ArrowRightIcon className="size-3.5" /></span>
          {cheapest ? <LicensePrice license={cheapest} /> : <span className="text-xs text-accent-text">Preview only</span>}
        </Link>
      </div>
    </article>
  );
}
