"use client";

import Image from "next/image";
import { HeroCarouselSlot } from "./HeroCarouselSlot";
import { useHeroCarouselMotion } from "./useHeroCarouselMotion";
import { AudioFavoriteButton } from "@/components/audio/AudioFavoriteButton";
import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import {
  PlayerPauseIcon,
  PlayerPlayIcon,
} from "@/components/audio/PlayerIcons";
import { TrackSpectrum } from "@/components/audio/TrackSpectrum";
import {
  useAudioActions,
  useAudioTransport,
} from "@/components/audio/AudioPlayerProvider";
import {
  discountNow,
  synchronizeDiscountClock,
  useDiscountSecond,
} from "@/components/discounts/clock";
import { LicensePrice } from "@/components/discounts/LicensePrice";
import { ArrowRightIcon, MusicNoteIcon } from "@/components/ui/icons";
import {
  NeumorphicButton,
  NeumorphicLink,
} from "@/components/ui/neumorphic/Button";
import { effectiveLicensePrice } from "@/lib/marketplace/discounts";
import type { MarketplaceTrack } from "@/lib/marketplace/types";
import type { AudioTrack } from "@/lib/audio/types";
import { marketplaceAudioTrack } from "@/lib/audio/marketplace-track";
import type { HeroResponse, PublicHeroPlacement } from "@/lib/hero/types";

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
type HeroSlide = {
  id: string;
  label: string;
  audio: AudioTrack;
  beat?: MarketplaceTrack;
};

function Cover({
  audio,
  decorative = false,
}: {
  audio: AudioTrack;
  decorative?: boolean;
}) {
  return audio.coverUrl ? (
    <Image
      src={audio.coverUrl}
      alt={decorative ? "" : `${audio.title} cover artwork`}
      fill
      unoptimized
      draggable={false}
      sizes="(max-width: 600px) 280px, 360px"
      className="hero-featured-cover-image"
    />
  ) : (
    <div className="hero-featured-cover-fallback artwork-nocturne">
      <MusicNoteIcon />
    </div>
  );
}
function FeaturedCard({ selected, selectedIndex, total, selectedPlaying, onPlay, now }: { selected: HeroSlide; selectedIndex: number; total: number; selectedPlaying: boolean; onPlay: () => void; now: number }) {
  const cheapest = selected?.beat
    ? [...selected.beat.licenses]
        .filter(
          (license) =>
            license.licenseType === "NON_EXCLUSIVE" &&
            license.formats.length > 0 &&
            license.formats.every((format) => format === "WAV"),
        )
        .sort(
          (a, b) =>
            effectiveLicensePrice(a, now) - effectiveLicensePrice(b, now),
        )[0]
    : null;

  return (<article
                key={selected.id}
                className="hero-featured-card hero-featured-card-main"
                data-demo={!selected.beat}
                role="group"
                aria-roledescription="slide"
                aria-label={`${selectedIndex + 1} of ${total}: ${selected.audio.title}`}
              >
                <div className="hero-featured-card-top">
                  <span>{selected.label || "Producer spotlight"}</span>
                  <span className="hero-featured-sponsored">
                    {selected.beat ? "Sponsored" : "Full track"}
                  </span>
                </div>
                <div className="hero-featured-art">
                {selected.beat ? (
                  <Link
                    href={`/tracks/${selected.beat.id}`}
                    className="hero-featured-cover"
                    aria-label={`View ${selected.audio.title} and licenses`}
                    draggable={false}
                  >
                    <Cover audio={selected.audio} />
                  </Link>
                ) : (
                  <NeumorphicButton
                    className="hero-featured-cover"
                    aria-label={`${selectedPlaying ? "Pause" : "Play"} cover ${selected.audio.title}`}
                    onClick={onPlay}
                  >
                    <Cover audio={selected.audio} />
                  </NeumorphicButton>
                )}
                  <AudioFavoriteButton track={selected.audio} className="hero-featured-favorite" />
                </div>
                <div className="hero-featured-track-row">
                  <div className="hero-featured-track-copy">
                    <h3>
                      {selected.beat ? (
                        <Link href={`/tracks/${selected.beat.id}`}>
                          {selected.audio.title}
                        </Link>
                      ) : (
                        selected.audio.title
                      )}
                    </h3>
                    <p>{selected.audio.artist}</p>
                  </div>
                  <NeumorphicButton
                    variant="accent"
                    className="hero-featured-play"
                    aria-label={`${selectedPlaying ? "Pause" : "Play"} featured beat ${selected.audio.title}`}
                    aria-pressed={selectedPlaying}
                    disabled={!selected.audio.src}
                    onClick={onPlay}
                  >
                    {selectedPlaying ? <PlayerPauseIcon /> : <PlayerPlayIcon />}
                  </NeumorphicButton>
                </div>
                {selected.beat ? (
                  <p className="hero-featured-metadata">
                    <span>{selected.beat.genre?.name || "Original beat"}</span>
                    <span>{selected.beat.bpm} BPM</span>
                    <span>{selected.beat.musicalKey}</span>
                  </p>
                ) : (
                  <p className="hero-featured-metadata">
                    <span>Listening session</span>
                    <span>MP3</span>
                  </p>
                )}
                <div className="hero-featured-price">
                  {selected.beat ? (
                    <>
                      <span>License from</span>
                      {cheapest ? (
                        <LicensePrice license={cheapest} />
                      ) : (
                        <Link href={`/tracks/${selected.beat.id}`}>
                          View licenses
                        </Link>
                      )}
                    </>
                  ) : (
                    <p className="hero-featured-description">
                      {selected.audio.description}
                    </p>
                  )}
                </div>
                <div className="hero-featured-audio">
                  <div>
                    <TrackSpectrum trackId={selected.audio.id} variant="bars" />
                  </div>
                  <span>
                    {selected.beat ? "30s preview" : "Full-length demo"}
                  </span>
                </div>
              </article>);
}

export function FeaturedBeats({ demos, fallbackDemos }: { demos?: AudioTrack[]; fallbackDemos?: AudioTrack[] }) {
  const player = useAudioTransport();
  const actions = useAudioActions();
  const demoMode = Boolean(demos?.length);
  const hostRef = useRef<HTMLDivElement>(null);
  const advanceRef = useRef<(direction: number) => void>(() => {});
  const [placements, setPlacements] = useState<PublicHeroPlacement[]>([]);
  const [loading, setLoading] = useState(!demoMode);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [autoPaused, setAutoPaused] = useState(false);
  const second = useDiscountSecond();
  const now = second || discountNow();
  const sponsored: HeroSlide[] = placements
        .filter(
          (placement) =>
            Date.parse(placement.startsAt) <= now &&
            Date.parse(placement.endsAt) > now,
        )
        .map((placement) => ({
          id: placement.id,
          label: placement.label,
          audio: marketplaceAudioTrack(placement.track),
          beat: placement.track,
        }));
  const showingDemos = demoMode || sponsored.length === 0 && Boolean(fallbackDemos?.length);
  const visible: HeroSlide[] = demoMode
    ? demos!.map(audio => ({ id: audio.id, label: "Listening demo", audio }))
    : sponsored.length ? sponsored : (fallbackDemos ?? []).map(audio => ({ id: audio.id, label: "Listening demo", audio }));
  const signature = visible.map((placement) => placement.id).join("|");
  const selectedIndex = Math.max(
    0,
    visible.findIndex((placement) => placement.id === selectedId),
  );
  const selected = visible[selectedIndex];
  const selectedPlaying = Boolean(
    selected && player.track?.id === selected.audio.id && player.playing,
  );
  const { stageRef, trackRef, positions, registerSlot, advance, dragging, pointerDown, pointerMove, finishSwipe, clickCapture } = useHeroCarouselMotion(signature, selected?.id, setSelectedId, reducedMotion);
  const rotating =
    !dragging &&
    !autoPaused &&
    !reducedMotion &&
    inView &&
    pageVisible &&
    !hovered &&
    !focused &&
    !selectedPlaying &&
    visible.length > 1;

  useEffect(() => {
    if (demoMode) return;
    const controller = new AbortController();
    fetch("/api/hero", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as HeroResponse & {
          error?: string;
        };
        if (!response.ok || !Array.isArray(data.placements))
          throw new Error(
            data.error || "Featured beats are taking a moment to load.",
          );
        if (controller.signal.aborted) return;
        synchronizeDiscountClock(
          data.serverTime ?? response.headers.get("date"),
        );
        setPlacements(data.placements.slice(0, 10));
        setError("");
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Featured beats are taking a moment to load.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry, demoMode]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let alive = true;
    function changeMotion() {
      setReducedMotion(motion.matches);
    }
    function changeVisibility() {
      setPageVisible(!document.hidden);
    }
    Promise.resolve().then(() => {
      if (alive) {
        changeMotion();
        changeVisibility();
      }
    });
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(host);
    motion.addEventListener("change", changeMotion);
    document.addEventListener("visibilitychange", changeVisibility);
    return () => {
      alive = false;
      observer.disconnect();
      motion.removeEventListener("change", changeMotion);
      document.removeEventListener("visibilitychange", changeVisibility);
    };
  }, []);

  useLayoutEffect(() => { advanceRef.current = advance; });
  useEffect(() => {
    if (!rotating) return;
    const timer = setTimeout(() => advanceRef.current(1), 6000);
    return () => clearTimeout(timer);
  }, [signature, rotating, selected?.id]);

  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    advance(event.key === "ArrowLeft" ? -1 : 1);
  }
  function blur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  }
  function refresh() {
    setLoading(true);
    setRetry((value) => value + 1);
  }

  return (
    <div
      ref={hostRef}
      className="hero-featured"
      role="region"
      aria-roledescription="carousel"
      aria-label={
        showingDemos ? "Featured listening demos" : "Featured sponsored beats"
      }
      aria-busy={loading && !selected}
      onKeyDown={keyboard}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={blur}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
    >
      {selected && <div className="hero-featured-heading">
        <div><h2>{showingDemos ? "Listening demos" : "Producer spotlight"}</h2><p className="hero-featured-context">{showingDemos ? "Full tracks · not for sale" : "Sponsored · 30-second previews"}</p></div>
        <div className="hero-featured-tools"><span className="hero-featured-counter">{String(selectedIndex + 1).padStart(2,"0")} / {String(visible.length).padStart(2,"0")}</span>
          {error && !demoMode && <NeumorphicButton variant="quiet" size="sm" className="hero-featured-retry" disabled={loading} aria-label="Retry featured placements" onClick={refresh}>Retry</NeumorphicButton>}
          <NeumorphicButton variant="quiet" size="sm" className="hero-featured-auto" disabled={visible.length < 2 || reducedMotion} aria-label={autoPaused ? "Resume automatic featured slides" : "Pause automatic featured slides"} aria-pressed={autoPaused} onClick={()=>setAutoPaused(value=>!value)}>{autoPaused ? <PlayerPlayIcon/> : <PlayerPauseIcon/>}</NeumorphicButton>
        </div>
      </div>}
      {loading && !selected ? (
        <div
          className="hero-featured-placeholder hero-featured-loading"
          role="status"
          aria-label="Loading featured beats"
        >
          <div className="hero-featured-loading-art" />
          <span />
          <span />
          <p>Finding your next sound…</p>
        </div>
      ) : !selected ? (
        <div className="hero-featured-placeholder">
          <MusicNoteIcon />
          <p className="hero-featured-empty-kicker">
            Independent sound. New possibilities.
          </p>
          <h3>
            {error
              ? "The spotlight is taking a moment."
              : "Your next discovery is waiting."}
          </h3>
          <p>
            {error ||
              "Explore original beats and find the sound that speaks to you."}
          </p>
          <div className="hero-featured-empty-actions">
            {error && (
              <NeumorphicButton size="sm" onClick={refresh}>
                Try again
              </NeumorphicButton>
            )}
            <NeumorphicLink href="/marketplace" size="sm">
              Explore beats <ArrowRightIcon className="size-4" />
            </NeumorphicLink>
          </div>
        </div>
      ) : (
        <>
          <div
            ref={stageRef}
            className="hero-featured-deck"
            data-dragging={dragging}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={finishSwipe}
            onPointerCancel={(event) => finishSwipe(event, true)}
            onLostPointerCapture={(event) => {
              if (event.target === event.currentTarget)
                finishSwipe(event, true);
            }}
            onClickCapture={clickCapture}
          >
            <div className="hero-featured-motion-window">
              <div ref={trackRef} className="hero-featured-cards-track" aria-live={rotating ? "off" : "polite"}>
                {visible.map((slide, index) => <HeroCarouselSlot key={slide.id} id={slide.id} position={positions[index]?.position ?? 0} onRegister={registerSlot}>
                  <FeaturedCard selected={slide} selectedIndex={index} total={visible.length} selectedPlaying={player.track?.id === slide.audio.id && player.playing} onPlay={() => actions.toggle(slide.audio, visible.map((item) => item.audio))} now={now} />
                </HeroCarouselSlot>)}
              </div>
            </div>
            {visible.length > 1 && (
              <>
                <NeumorphicButton
                  className="hero-featured-arrow hero-featured-arrow-previous"
                  aria-label="Previous featured beat"
                  onClick={() => advance(-1)}
                >
                  <Chevron previous />
                </NeumorphicButton>
                <NeumorphicButton
                  className="hero-featured-arrow hero-featured-arrow-next"
                  aria-label="Next featured beat"
                  onClick={() => advance(1)}
                >
                  <Chevron />
                </NeumorphicButton>
              </>
            )}
          </div>
         
        </>
      )}
    </div>
  );
}
