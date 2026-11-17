"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { useAudioPlayer } from "@/components/audio/AudioPlayerProvider";
import { PlayerLoaderIcon, PlayerPauseIcon, PlayerPlayIcon, PlayerSkipIcon, PlayerVolumeIcon } from "@/components/audio/PlayerIcons";
import { TrackSpectrum } from "@/components/audio/TrackSpectrum";
import { DiscountCountdown } from "@/components/discounts/DiscountCountdown";
import { LicensePrice } from "@/components/discounts/LicensePrice";
import { discountNow, synchronizeDiscountClock, useDiscountActive } from "@/components/discounts/clock";
import { formatTime, useMarketplace } from "@/components/marketplace/MarketplaceProvider";
import { ArrowRightIcon, CheckIcon, MusicNoteIcon, ShieldIcon } from "@/components/ui/icons";
import { NeumorphicButton, NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { effectiveLicensePrice } from "@/lib/marketplace/discounts";
import type { MarketplaceLicense, MarketplaceTrack } from "@/lib/marketplace/types";

function Heart({ saved = false }: { saved?: boolean }) {
  return <svg viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} aria-hidden="true"><path d="m12 20-7.1-6.8a5 5 0 0 1 7.1-7 5 5 0 0 1 7.1 7L12 20Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>;
}

/** Progress subscriptions stay in the console; the entire license page does not repaint on each time update. */
function PreviewConsole({ track }: { track: MarketplaceTrack }) {
  const audio = useAudioPlayer();
  const marketplace = useMarketplace();
  const seekId = useId();
  const selected = audio.track?.id === track.id;
  const playing = selected && audio.playing;
  const buffering = selected && audio.buffering;
  const duration = selected && audio.duration ? audio.duration : Math.min(track.previewDurationSeconds || 30, 30);
  const elapsed = selected ? Math.min(audio.elapsed, duration) : 0;
  const progress = duration ? elapsed / duration * 100 : 0;
  const available = Boolean(selected && audio.duration);
  const progressStyle = { "--detail-progress": `${progress}%` } as CSSProperties;
  const status = selected && audio.error ? "Preview unavailable" : buffering ? "Loading preview" : playing ? "Now playing" : selected && elapsed > 0 ? "Paused" : "Press play to listen";

  return <div className="detail-console music-glass">
    <div className="detail-console-heading"><span className="detail-console-status" data-playing={playing}><span className="music-status-dot" aria-hidden="true" />{status}</span><span>PRODUCER’S PREVIEW · {duration}s</span></div>
    <div className="detail-console-spectrum"><TrackSpectrum trackId={track.id} variant="bars" /></div>
    <div className="detail-seek" style={progressStyle}>
      <span className="detail-seek-rail" aria-hidden="true"><span /></span>
      <label htmlFor={seekId} className="sr-only">Preview playback position</label>
      <input id={seekId} type="range" min={0} max={duration || 1} step={0.1} value={elapsed} disabled={!available} onChange={(event) => audio.seek(Number(event.target.value))} aria-valuetext={`${formatTime(elapsed)} of ${formatTime(duration)}`} />
    </div>
    <div className="detail-console-times"><span>{formatTime(elapsed)}</span><span>{formatTime(duration)}</span></div>
    <div className="detail-console-controls">
      <button type="button" className="detail-round-control" disabled={!available} onClick={() => audio.skip(-10)} aria-label="Rewind preview 10 seconds"><PlayerSkipIcon /></button>
      <button type="button" className="neo-button neo-button-accent detail-main-play" disabled={!track.previewUrl} onClick={() => buffering ? audio.pause() : marketplace.toggle(track)} aria-label={playing || buffering ? "Pause preview" : "Play preview"}>
        {buffering ? <PlayerLoaderIcon className="detail-loading" /> : playing ? <PlayerPauseIcon /> : <PlayerPlayIcon />}<span>{playing || buffering ? "Pause preview" : "Play preview"}</span>
      </button>
      <button type="button" className="detail-round-control" disabled={!available} onClick={() => audio.skip(10)} aria-label="Forward preview 10 seconds"><PlayerSkipIcon forward /></button>
      <button type="button" className="detail-round-control detail-mute" aria-label={audio.muted || audio.volume === 0 ? "Unmute audio" : "Mute audio"} onClick={audio.toggleMuted}><PlayerVolumeIcon muted={audio.muted || audio.volume === 0} /></button>
    </div>
    {selected && audio.error && <p className="detail-preview-error" role="alert">{audio.error} <button type="button" onClick={audio.retry}>Try again</button></p>}
    <p className="detail-preview-note">Selected by the producer · {formatTime(track.previewStartSeconds)}–{formatTime(track.previewStartSeconds + duration)} of the full track</p>
  </div>;
}

export function TrackDetail({ id }: { id: string }) {
  const [track, setTrack] = useState<MarketplaceTrack | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [extraLicenses, setExtraLicenses] = useState<MarketplaceLicense[]>([]);
  const [licensePage, setLicensePage] = useState(1);
  const [moreLicenses, setMoreLicenses] = useState(false);
  const [licenseBusy, setLicenseBusy] = useState(false);
  const [licenseError, setLicenseError] = useState("");
  const licenseRequest = useRef<AbortController | null>(null);
  const abortLicenseRequest = useCallback(() => licenseRequest.current?.abort(), []);
  const player = useMarketplace();
  const onSale = useDiscountActive(track?.discount);

  useEffect(() => {
    const controller = new AbortController();
    abortLicenseRequest();
    fetch(`/api/tracks/${id}`, { signal: controller.signal, cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Track unavailable.");
      if (controller.signal.aborted) return;
      synchronizeDiscountClock(data.serverTime ?? response.headers.get("date"));
      setTrack(data.track); setExtraLicenses([]); setLicensePage(1); setMoreLicenses(Boolean(data.track.hasMoreLicenses)); setLicenseBusy(false); setLicenseError(""); setError("");
    }).catch((failure: unknown) => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Track unavailable."); });
    return () => { controller.abort(); abortLicenseRequest(); };
  }, [id, retry, abortLicenseRequest]);

  async function loadMoreLicenses() {
    abortLicenseRequest();
    const controller = new AbortController(); licenseRequest.current = controller;
    setLicenseBusy(true); setLicenseError("");
    try {
      const response = await fetch(`/api/contracts?trackId=${id}&page=${licensePage + 1}&pageSize=12`, { cache: "no-store", signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load more licenses.");
      if (controller.signal.aborted) return;
      synchronizeDiscountClock(data.serverTime ?? response.headers.get("date"));
      setExtraLicenses((licenses) => [...new Map([...licenses, ...data.contracts as MarketplaceLicense[]].map((license) => [license.id, license])).values()]);
      setLicensePage(data.page); setMoreLicenses(data.hasMore);
    } catch (failure) { if (!controller.signal.aborted) setLicenseError(failure instanceof Error ? failure.message : "Could not load more licenses."); }
    finally { if (!controller.signal.aborted) setLicenseBusy(false); }
  }

  if (error) return <div role="alert" className="detail-error music-glass"><MusicNoteIcon /><h1>This beat is out of reach.</h1><p>{error}</p><NeumorphicButton onClick={() => { setError(""); setRetry((value) => value + 1); }}>Try again</NeumorphicButton><Link href="/marketplace">Back to beats</Link></div>;
  if (!track || track.id !== id) return <div className="detail-skeleton" role="status" aria-label="Loading track"><div className="detail-skeleton-art neo-raised" /><div><div className="detail-skeleton-title neo-inset" /><div className="detail-skeleton-console neo-raised" /></div><span className="sr-only">Loading track</span></div>;

  const active = player.track?.id === track.id && player.playing;
  const saved = player.favoriteIds.has(track.id);
  const licenses = [...new Map([...track.licenses, ...extraLicenses].map((license) => [license.id, license])).values()];
  const cheapest = [...licenses].filter((license) => license.licenseType === "NON_EXCLUSIVE").sort((a, b) => Number(a.originalPrice ?? a.price) - Number(b.originalPrice ?? b.price))[0];

  return <div className="track-detail">
    <nav className="detail-breadcrumb" aria-label="Breadcrumb"><Link href="/marketplace"><span aria-hidden="true">←</span> Explore beats</Link><span aria-hidden="true">/</span><span>{track.genre?.name || "Original beats"}</span><span className="detail-breadcrumb-end">THE LISTENING EXPERIENCE</span></nav>

    <section className="detail-hero" aria-labelledby="track-title">
      <div className="detail-stage music-glass" data-playing={active}>
        <div className="detail-stage-top"><span className="detail-stage-kicker">ORIGINAL SOUND / 01</span><span className="detail-stage-live"><span className="music-status-dot" aria-hidden="true" />{active ? "ON AIR" : "READY TO PLAY"}</span></div>
        <div className="detail-art-stage">
          <div className="detail-stage-grid" aria-hidden="true" />
          <div className="detail-art-halo" aria-hidden="true" />
          <TrackSpectrum trackId={track.id} />
          <div className="detail-album artwork-nocturne">{track.artworkUrl ? <Image src={track.artworkUrl} alt={`Cover artwork for ${track.title}`} fill sizes="(max-width:640px) 60vw, (max-width:1024px) 46vw, 360px" unoptimized className="object-cover" /> : <MusicNoteIcon className="detail-album-placeholder" />}</div>
          <span className="detail-stage-coordinate detail-stage-coordinate-left" aria-hidden="true">{track.bpm}<small>BPM</small></span><span className="detail-stage-coordinate detail-stage-coordinate-right" aria-hidden="true">{track.musicalKey}<small>KEY</small></span>
        </div>
        <div className="detail-stage-bottom"><span className="detail-stage-caption">{active ? "Frequency spectrum · live audio" : "Your next idea starts here."}</span><span className="detail-stage-quality">WAV <span aria-hidden="true">↗</span></span></div>
      </div>

      <div className="detail-intro">
        <div className="detail-type-row"><span className="detail-type-tag">{track.genre?.name || "Original beat"}</span><span className="detail-track-kind">INSTRUMENTAL</span>{onSale && track.discount && <span className="detail-sale-tag">−{track.discount.percentage}%</span>}</div>
        <h1 id="track-title">{track.title}</h1>
        <div className="detail-producer"><span className="detail-producer-avatar" aria-hidden="true">{track.producerName.trim().charAt(0).toUpperCase() || "P"}</span><span><small>Produced by</small><strong>{track.producerName}</strong></span><ShieldIcon /></div>
        <dl className="detail-metadata"><div><dt>Tempo</dt><dd>{track.bpm}<span>BPM</span></dd></div><div><dt>Key</dt><dd>{track.musicalKey || "—"}</dd></div><div><dt>Full length</dt><dd>{formatTime(track.durationSeconds)}</dd></div></dl>
        <PreviewConsole track={track} />
        <div className="detail-secondary-actions"><button type="button" className="detail-save" onClick={() => void player.favorite(track.id)} aria-pressed={saved}><Heart saved={saved} />{saved ? "Saved to your collection" : "Save to collection"}</button><a href="#licenses" className="detail-license-anchor">View licenses <ArrowRightIcon /></a></div>
      </div>
    </section>

    <div className="detail-story-grid">
      <section className="detail-about" aria-labelledby="about-track-title"><p className="music-eyebrow">Behind the sound</p><h2 id="about-track-title">Make it your own.</h2><p className="detail-description">{track.description || "An original instrumental, ready for your next idea. Find your flow, build your track, and bring your sound to life."}</p>{track.tags.length > 0 && <div className="detail-tags">{track.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}</section>
      <aside className="detail-purchase-summary music-glass" aria-label="Licensing overview"><div className="detail-summary-heading"><ShieldIcon /><span>One beat. Your next release.</span></div>{cheapest ? <><p>Licenses from</p><LicensePrice license={cheapest} large /></> : <p>Listen now. Licensing options are listed below.</p>}{onSale && track.discount && <DiscountCountdown discount={track.discount} />}<a className="detail-summary-link" href="#licenses">Find your license <ArrowRightIcon /></a><small>The complete WAV is delivered after verified payment.</small></aside>
    </div>

    <section className="detail-licenses" id="licenses" aria-labelledby="licenses-title">
      <header className="detail-license-heading"><div><p className="music-eyebrow">Made for your next move</p><h2 id="licenses-title">Your sound. Your license.</h2><p>Compare usage limits and read the producer’s terms. All prices are in toman.</p></div><span className="detail-license-currency">IRT / TOMAN</span></header>
      {!licenses.length ? <div className="detail-no-licenses neo-inset"><MusicNoteIcon /><h3>Enjoy the preview.</h3><p>The producer hasn’t listed a license for this beat yet.</p></div> : <div className="detail-license-grid">{licenses.map((license, index) => {
        const inCart = player.cart.some((item) => item.track.id === track.id && item.license.id === license.id);
        const purchasable = license.licenseType === "NON_EXCLUSIVE";
        return <article key={license.id} className={`detail-license music-glass${cheapest?.id === license.id ? " detail-license-featured" : ""}`}>
          <div className="detail-license-topline"><span>{String(index + 1).padStart(2, "0")} / {license.licenseType === "EXCLUSIVE" ? "EXCLUSIVE" : license.licenseType === "CUSTOM" ? "CUSTOM" : "NON-EXCLUSIVE"}</span>{cheapest?.id === license.id && <span className="detail-license-entry">START HERE</span>}</div>
          <h3>{license.title}</h3><div className="detail-license-price"><LicensePrice license={license} large /><span>One-time payment</span></div>
          <ul>{[`${license.formats.join(" + ")} download`, license.streamingLimit === null ? "Unlimited streams" : `${license.streamingLimit.toLocaleString()} streams`, license.distributionLimit === null ? "Unlimited distributions" : `${license.distributionLimit.toLocaleString()} distributions`, "Producer credit required"].map((term) => <li key={term}><CheckIcon /><span>{term}</span></li>)}</ul>
          {license.customTerms && <details className="detail-license-terms"><summary>Additional license terms <span aria-hidden="true">+</span></summary><p>{license.customTerms}</p></details>}
          <div className="detail-license-footer">{purchasable ? <NeumorphicButton className="w-full" variant={cheapest?.id === license.id || inCart ? "accent" : "default"} onClick={() => player.add(track, { ...license, price: String(effectiveLicensePrice(license, discountNow())) })}>{inCart ? "Update cart" : "Add to cart"}<ArrowRightIcon className="size-4" /></NeumorphicButton> : <p className="detail-agreement-note">{license.licenseType === "EXCLUSIVE" ? "Exclusive sales require a separate producer agreement." : "Contact the producer to arrange this custom license."} Online checkout is available for non-exclusive licenses.</p>}<span className="detail-contract-version">Producer’s terms · Version {license.version}</span></div>
        </article>;
      })}</div>}
      {licenseError && <p role="alert" className="detail-license-error">{licenseError}</p>}{moreLicenses && <NeumorphicButton className="mt-7" disabled={licenseBusy} onClick={() => void loadMoreLicenses()}>{licenseBusy ? "Loading licenses…" : "Load more licenses"}</NeumorphicButton>}
      <div className="detail-checkout-note"><span><ShieldIcon />Review and accept the license terms at checkout.</span><NeumorphicLink href="/cart">View cart ({player.cart.length}) <ArrowRightIcon className="size-4" /></NeumorphicLink></div>
    </section>
  </div>;
}
