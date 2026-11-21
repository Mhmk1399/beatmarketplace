"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TrackDetailSkeleton } from "./TrackDetailSkeleton";
import { useDetailNavHeight } from "./useDetailNavHeight";
import { useTrackDetail, type TrackDetailResponse } from "./useTrackDetail";
import { useAudioPlayer } from "@/components/audio/AudioPlayerProvider";
import { DynamicModal } from "@/components/ui/dynamic/DynamicModal";
import { useToast } from "@/components/ui/toast/ToastProvider";
import {
  PlayerLoaderIcon,
  PlayerPauseIcon,
  PlayerPlayIcon,
} from "@/components/audio/PlayerIcons";
import { PlayerTimeline } from "@/components/audio/PlayerTimeline";
import { DiscountCountdown } from "@/components/discounts/DiscountCountdown";
import { LicensePrice } from "@/components/discounts/LicensePrice";
import {
  discountNow,
  synchronizeDiscountClock,
  useDiscountActive,
} from "@/components/discounts/clock";
import {
  formatTime,
  useMarketplace,
} from "@/components/marketplace/MarketplaceProvider";
import {
  ArrowRightIcon,
  CheckIcon,
  CartIcon,
  MusicNoteIcon,
  ShieldIcon,
} from "@/components/ui/icons";
import {
  NeumorphicButton,
  NeumorphicLink,
} from "@/components/ui/neumorphic/Button";
import { effectiveLicensePrice } from "@/lib/marketplace/discounts";
import { TrackVisit } from "@/components/analytics/TrackVisit";
import type {
  MarketplaceLicense,
  MarketplaceTrack,
} from "@/lib/marketplace/types";

function Heart({ saved = false }: { saved?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={saved ? "currentColor" : "none"}
      aria-hidden="true"
    >
      <path
        d="m12 20-7.1-6.8a5 5 0 0 1 7.1-7 5 5 0 0 1 7.1 7L12 20Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon() {
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
      <path d="M12 15V3m-4 4 4-4 4 4M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
    </svg>
  );
}

/** Playback progress stays inside this console, away from the artwork and license page. */
function PreviewConsole({ track }: { track: MarketplaceTrack }) {
  const audio = useAudioPlayer();
  const marketplace = useMarketplace();
  const selected = audio.track?.id === track.id;
  const playing = selected && audio.playing,
    buffering = selected && audio.buffering;
  const failed = Boolean(selected && audio.error);
  const duration =
    selected && audio.duration
      ? Math.min(audio.duration, 30)
      : Math.min(track.previewDurationSeconds || 30, 30);
  const available = Boolean(selected && audio.duration);
  const timelinePlayer = {
    ...audio,
    duration,
    elapsed: selected ? Math.min(audio.elapsed, duration) : 0,
    buffered: selected ? Math.min(audio.buffered, duration) : 0,
  };
  const status = !track.previewUrl
    ? "Preview coming soon"
    : selected && audio.error
      ? "Preview unavailable"
      : buffering
        ? "Loading preview"
        : playing
          ? "Now playing"
          : selected && audio.elapsed > 0
            ? "Paused"
            : "Producer-selected 30-second preview";

  return (
    <div
      className="detail-console"
      data-playing={playing}
      data-preview-available={Boolean(track.previewUrl)}
    >
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
      <NeumorphicButton
        variant="accent"
        className="detail-main-play"
        disabled={!track.previewUrl}
        onClick={() =>
          failed
            ? audio.retry()
            : buffering
              ? audio.pause()
              : marketplace.toggle(track)
        }
        aria-label={
          !track.previewUrl
            ? "Preview coming soon"
            : failed
              ? "Retry preview"
              : playing || buffering
                ? "Pause preview"
                : "Play preview"
        }
        aria-pressed={playing || buffering}
        title={status}
      >
        {buffering ? (
          <PlayerLoaderIcon className="detail-loading" />
        ) : playing ? (
          <PlayerPauseIcon />
        ) : (
          <PlayerPlayIcon />
        )}
      </NeumorphicButton>
      <div className="detail-console-timeline">
        <PlayerTimeline
          player={timelinePlayer}
          trackId={track.id}
          disabled={!available}
          seekLabel="Preview playback position"
          large
          className="detail-preview-timeline"
        />
        {!track.previewUrl && (
          <p className="detail-console-status">Preview coming soon</p>
        )}
        {failed && (
          <p className="detail-preview-error" role="alert">
            Preview unavailable. Try play again.
          </p>
        )}
      </div>
    </div>
  );
}

function TrackListeningHero({
  track,
  active,
  saved,
  onSale,
  onSave,
}: {
  track: MarketplaceTrack;
  active: boolean;
  saved: boolean;
  onSale: boolean;
  onSave: () => void;
}) {
  const screen = useDetailNavHeight();
  const [shareBusy, setShareBusy] = useState(false),
    [shareLink, setShareLink] = useState<string | null>(null);
  const toast = useToast();
  async function share() {
    if (shareBusy) return;
    const url = `${window.location.origin}/tracks/${track.id}`;
    setShareBusy(true);
    try {
      if (navigator.share) {
        try {
          await navigator.share({
            title: track.title,
            text: `${track.title} by ${track.producerName}`,
            url,
          });
          return;
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") return;
        }
      }
      try {
        if (!navigator.clipboard?.writeText)
          throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(url);
        toast.success("Link copied", "Ready to share this beat.");
      } catch {
        setShareLink(url);
      }
    } finally {
      setShareBusy(false);
    }
  }
  return (
    <section
      ref={screen}
      className="detail-first-screen"
      aria-labelledby="track-title"
      data-playing={active}
      data-artwork={Boolean(track.artworkUrl)}
    >
      <div className="detail-cover-backdrop" aria-hidden="true">
        {track.artworkUrl && (
          <Image
            src={track.artworkUrl}
            alt=""
            fill
            unoptimized
            sizes="100vw"
            loading="eager"
          />
        )}
      </div>
      <div className="detail-first-content">
        <nav className="detail-breadcrumb" aria-label="Breadcrumb">
          <Link href="/marketplace">
            <span aria-hidden="true">←</span> Explore beats
          </Link>
          <span aria-hidden="true">/</span>
          <span>{track.genre?.name || "Original beats"}</span>
          <span className="detail-breadcrumb-end">
            THE LISTENING EXPERIENCE
          </span>
        </nav>
        <div className="detail-listening-overview">
          <div className="detail-art-stage">
            <div className="detail-album artwork-nocturne">
              {track.artworkUrl ? (
                <Image
                  src={track.artworkUrl}
                  alt={`Cover artwork for ${track.title}`}
                  fill
                  unoptimized
                  sizes="(max-width:767px) 42vw, 330px"
                  loading="eager"
                  fetchPriority="high"
                  className="object-cover"
                />
              ) : (
                <MusicNoteIcon className="detail-album-placeholder" />
              )}
            </div>
          </div>
          <header className="detail-intro">
            <div className="detail-type-row">
              <span className="detail-type-tag">
                {track.genre?.name || "Original beat"}
              </span>
              <span className="detail-track-kind">INSTRUMENTAL</span>
              {onSale && track.discount && (
                <span className="detail-sale-tag">
                  −{track.discount.percentage}%
                </span>
              )}
            </div>
            <h1 id="track-title" dir="auto" title={track.title}>
              {track.title}
            </h1>
            <Link
              className="detail-producer"
              href={`/producers/${track.producerId}`}
              prefetch={false}
              aria-label={`Visit ${track.producerName}’s producer page`}
            >
              <span className="detail-producer-avatar" aria-hidden="true">
                {track.producerAvatarUrl ? (
                  <Image
                    src={track.producerAvatarUrl}
                    alt=""
                    fill
                    unoptimized
                    sizes="40px"
                  />
                ) : (
                  track.producerName.trim().charAt(0).toUpperCase() || "P"
                )}
              </span>
              <span>
                <small>Produced by</small>
                <strong>{track.producerName}</strong>
              </span>
              <ArrowRightIcon />
            </Link>
            <dl className="detail-metadata">
              <div>
                <dt>Tempo</dt>
                <dd>
                  {track.bpm}
                  <span>BPM</span>
                </dd>
              </div>
              <div>
                <dt>Key</dt>
                <dd>{track.musicalKey || "—"}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>
                  {track.durationSeconds
                    ? formatTime(track.durationSeconds)
                    : "—"}
                </dd>
              </div>
            </dl>
          </header>
        </div>
        <PreviewConsole track={track} />
        <div className="detail-secondary-actions">
          <NeumorphicLink
            href="#licenses"
            variant="accent"
            className="detail-license-anchor"
          >
            <CartIcon />
            <span>View licenses</span>
          </NeumorphicLink>
          <NeumorphicButton
            className="detail-save"
            onClick={onSave}
            aria-label={saved ? "Remove from favorites" : "Save to favorites"}
            aria-pressed={saved}
          >
            <Heart saved={saved} />
            <span>{saved ? "Saved" : "Save"}</span>
          </NeumorphicButton>
          <NeumorphicButton
            className="detail-share"
            disabled={shareBusy}
            aria-busy={shareBusy}
            onClick={() => void share()}
          >
            <ShareIcon />
            <span>Share</span>
          </NeumorphicButton>
        </div>
      </div>
      {shareLink && (
        <DynamicModal
          open
          size="sm"
          title="Share this beat"
          description="Select and copy the link to share this beat."
          onClose={() => setShareLink(null)}
          footer={
            <NeumorphicButton onClick={() => setShareLink(null)}>
              Close
            </NeumorphicButton>
          }
        >
          <label
            className="block text-sm font-semibold"
            htmlFor="detail-share-link"
          >
            Beat link
          </label>
          <input
            id="detail-share-link"
            type="url"
            readOnly
            data-autofocus
            value={shareLink}
            onFocus={(event) => event.currentTarget.select()}
            className="neo-input-wrap mt-3 min-h-12 w-full rounded-[var(--radius-control)] px-4 text-base"
          />
        </DynamicModal>
      )}
    </section>
  );
}

export function TrackDetail({ id }: { id: string }) {
  const { data, error, mutate, scope, isValidating } = useTrackDetail(id);
  // SWR exposes the retry error in state; consume its rejected promise as well.
  const refresh = () => { void mutate().catch(() => undefined); };
  if (error && (!data || [401, 403, 404].includes(error.status)))
    return (
      <div role="alert" className="detail-error music-glass">
        <MusicNoteIcon />
        <h1>This beat is out of reach.</h1>
        <p>{error.message}</p>
        <NeumorphicButton
          disabled={isValidating}
          aria-busy={isValidating}
          onClick={refresh}
        >
          Try again
        </NeumorphicButton>
        <Link href="/marketplace">Back to beats</Link>
      </div>
    );
  if (!data || data.track.id !== id) return <TrackDetailSkeleton />;
  return <LoadedTrackDetail key={`${scope}:${id}`} data={data} stale={Boolean(error)} refreshing={isValidating} refresh={refresh} />;
}

function initialLicensePage(track: MarketplaceTrack) {
  return { source: track, contracts: [] as MarketplaceLicense[], page: 1, hasMore: Boolean(track.hasMoreLicenses), busy: false, error: "" };
}

function LoadedTrackDetail({ data, stale, refreshing, refresh }: { data: TrackDetailResponse; stale: boolean; refreshing: boolean; refresh: () => void }) {
  const { track } = data, id = track.id;
  const viewToken = data.viewToken;
  const player = useMarketplace();
  const onSale = useDiscountActive(track.discount);
  const [licenseState, setLicenseState] = useState(() => initialLicensePage(track));
  const pages = licenseState.source === track ? licenseState : initialLicensePage(track);
  const { contracts: extraLicenses, page: licensePage, hasMore: moreLicenses, busy: licenseBusy, error: licenseError } = pages;
  const licenseRequest = useRef<AbortController | null>(null);
  useEffect(() => () => { licenseRequest.current?.abort(); licenseRequest.current = null; }, [track]);

  async function loadMoreLicenses() {
    if (licenseRequest.current) return;
    const controller = new AbortController();
    licenseRequest.current = controller;
    setLicenseState({ ...pages, busy: true, error: "" });
    try {
      const response = await fetch(`/api/contracts?trackId=${id}&page=${licensePage + 1}&pageSize=12`, { cache: "no-store", signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load more licenses.");
      if (controller.signal.aborted) return;
      synchronizeDiscountClock(result.serverTime ?? response.headers.get("date"));
      setLicenseState(previous => previous.source === track ? { ...previous, contracts: [...new Map([...previous.contracts, ...(result.contracts as MarketplaceLicense[])].map(license => [license.id, license])).values()], page: result.page, hasMore: result.hasMore } : previous);
    } catch (failure) {
      if (!controller.signal.aborted) setLicenseState(previous => previous.source === track ? { ...previous, error: failure instanceof Error ? failure.message : "Could not load more licenses." } : previous);
    } finally {
      if (!controller.signal.aborted) setLicenseState(previous => previous.source === track ? { ...previous, busy: false } : previous);
      if (licenseRequest.current === controller) licenseRequest.current = null;
    }
  }

  const active = player.track?.id === track.id && player.playing;
  const saved = player.favoriteIds.has(track.id);
  const licenses = [
    ...new Map(
      [...track.licenses, ...extraLicenses].map((license) => [
        license.id,
        license,
      ]),
    ).values(),
  ];
  const cheapest = [...licenses]
    .filter((license) => license.licenseType === "NON_EXCLUSIVE")
    .sort(
      (a, b) =>
        Number(a.originalPrice ?? a.price) - Number(b.originalPrice ?? b.price),
    )[0];

  return (
    <div className="track-detail">
      <TrackVisit
        key={track.id}
        id={track.id}
        producerId={track.producerId}
        token={viewToken}
      />
      <TrackListeningHero
        track={track}
        active={active}
        saved={saved}
        onSale={onSale}
        onSave={() => void player.favorite(track.id)}
      />
      <div className="detail-more-content">
        {stale && <div className="detail-refresh-notice" role="status"><p>Showing saved beat information. Reconnect or try again for the latest details.</p><NeumorphicButton size="sm" disabled={refreshing} aria-busy={refreshing} onClick={refresh}>Try again</NeumorphicButton></div>}
        <div className="detail-story-grid">
          <section className="detail-about" aria-labelledby="about-track-title">
            <p className="music-eyebrow">Behind the sound</p>
            <h2 id="about-track-title">Make it your own.</h2>
            <p className="detail-description">
              {track.description ||
                "An original instrumental, ready for your next idea. Find your flow, build your track, and bring your sound to life."}
            </p>
            {track.tags.length > 0 && (
              <div className="detail-tags">
                {track.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
            )}
            {Boolean(track.moods?.length) && (
              <div className="detail-classification">
                <h3>Explore this mood</h3>
                <div className="detail-classification-links">
                  {track.moods!.map((mood) => (
                    <Link
                      key={mood.id}
                      href={`/moods/${mood.slug}`}
                      prefetch={false}
                    >
                      {mood.name}
                      <ArrowRightIcon />
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {Boolean(track.instruments?.length) && (
              <div className="detail-classification">
                <h3>In the sound</h3>
                <div className="detail-classification-links">
                  {track.instruments!.map((instrument) => (
                    <Link
                      key={instrument.id}
                      href={`/instruments/${instrument.slug}`}
                      prefetch={false}
                    >
                      {instrument.name}
                      <ArrowRightIcon />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
          <aside
            className="detail-purchase-summary music-glass"
            aria-label="Licensing overview"
          >
            <div className="detail-summary-heading">
              <ShieldIcon />
              <span>One beat. Your next release.</span>
            </div>
            {cheapest ? (
              <>
                <p>Licenses from</p>
                <LicensePrice license={cheapest} large />
              </>
            ) : (
              <p>Listen now. Licensing options are listed below.</p>
            )}
            {onSale && track.discount && (
              <DiscountCountdown discount={track.discount} />
            )}
            <a className="detail-summary-link" href="#licenses">
              Find your license <ArrowRightIcon />
            </a>
            <small>The complete WAV is delivered after verified payment.</small>
          </aside>
        </div>

        <section
          className="detail-licenses"
          id="licenses"
          aria-labelledby="licenses-title"
        >
          <header className="detail-license-heading">
            <div>
              <p className="music-eyebrow">Made for your next move</p>
              <h2 id="licenses-title">Your sound. Your license.</h2>
              <p>
                Compare usage limits and read the producer’s terms. All prices
                are in toman.
              </p>
            </div>
            <span className="detail-license-currency">IRT / TOMAN</span>
          </header>
          {!licenses.length ? (
            <div className="detail-no-licenses neo-inset">
              <MusicNoteIcon />
              <h3>Enjoy the preview.</h3>
              <p>The producer hasn’t listed a license for this beat yet.</p>
            </div>
          ) : (
            <div className="detail-license-grid">
              {licenses.map((license, index) => {
                const inCart = player.cart.some(
                  (item) =>
                    item.track.id === track.id &&
                    item.license.id === license.id,
                );
                const purchasable = license.licenseType === "NON_EXCLUSIVE";
                return (
                  <article
                    key={license.id}
                    className={`detail-license music-glass${cheapest?.id === license.id ? " detail-license-featured" : ""}`}
                  >
                    <div className="detail-license-topline">
                      <span>
                        {String(index + 1).padStart(2, "0")} /{" "}
                        {license.licenseType === "EXCLUSIVE"
                          ? "EXCLUSIVE"
                          : license.licenseType === "CUSTOM"
                            ? "CUSTOM"
                            : "NON-EXCLUSIVE"}
                      </span>
                      {cheapest?.id === license.id && (
                        <span className="detail-license-entry">START HERE</span>
                      )}
                    </div>
                    <h3>{license.title}</h3>
                    <div className="detail-license-price">
                      <LicensePrice license={license} large />
                      <span>One-time payment</span>
                    </div>
                    <ul>
                      {[
                        `${license.formats.join(" + ")} download`,
                        license.streamingLimit === null
                          ? "Unlimited streams"
                          : `${license.streamingLimit.toLocaleString("en-US")} streams`,
                        license.distributionLimit === null
                          ? "Unlimited distributions"
                          : `${license.distributionLimit.toLocaleString("en-US")} distributions`,
                        "Producer credit required",
                      ].map((term) => (
                        <li key={term}>
                          <CheckIcon />
                          <span>{term}</span>
                        </li>
                      ))}
                    </ul>
                    {license.customTerms && (
                      <details className="detail-license-terms">
                        <summary>
                          Additional license terms{" "}
                          <span aria-hidden="true">+</span>
                        </summary>
                        <p>{license.customTerms}</p>
                      </details>
                    )}
                    <div className="detail-license-footer">
                      {purchasable ? (
                        <NeumorphicButton
                          className="w-full"
                          variant={
                            cheapest?.id === license.id || inCart
                              ? "accent"
                              : "default"
                          }
                          onClick={() =>
                            player.add(track, {
                              ...license,
                              price: String(
                                effectiveLicensePrice(license, discountNow()),
                              ),
                            })
                          }
                        >
                          {inCart ? "Update cart" : "Add to cart"}
                          <ArrowRightIcon className="size-4" />
                        </NeumorphicButton>
                      ) : (
                        <p className="detail-agreement-note">
                          {license.licenseType === "EXCLUSIVE"
                            ? "Exclusive sales require a separate producer agreement."
                            : "Contact the producer to arrange this custom license."}{" "}
                          Online checkout is available for non-exclusive
                          licenses.
                        </p>
                      )}
                      <span className="detail-contract-version">
                        Producer’s terms · Version {license.version}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {licenseError && (
            <p role="alert" className="detail-license-error">
              {licenseError}
            </p>
          )}
          {moreLicenses && (
            <NeumorphicButton
              className="mt-7"
              disabled={licenseBusy}
              onClick={() => void loadMoreLicenses()}
            >
              {licenseBusy ? "Loading licenses…" : "Load more licenses"}
            </NeumorphicButton>
          )}
          <div className="detail-checkout-note">
            <span>
              <ShieldIcon />
              Review and accept the license terms at checkout.
            </span>
            <NeumorphicLink href="/cart">
              View cart ({player.cart.length}){" "}
              <ArrowRightIcon className="size-4" />
            </NeumorphicLink>
          </div>
        </section>
      </div>
    </div>
  );
}
