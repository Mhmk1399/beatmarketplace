"use client";

import Image from "next/image";
import { AudioFavoriteButton } from "@/components/audio/AudioFavoriteButton";
import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
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
function SideCard({
  slide,
  side,
}: {
  slide: HeroSlide;
  side: "previous" | "next";
}) {
  return (
    <div
      className={`hero-featured-card hero-featured-side hero-featured-side-${side}`}
      aria-hidden="true"
    >
      <div className="hero-featured-side-art">
        <Cover audio={slide.audio} decorative />
      </div>
      <div className="hero-featured-side-copy">
        <strong>{slide.audio.title}</strong>
        <span>{slide.beat ? `${slide.beat.bpm} BPM` : "Listening room"}</span>
      </div>
    </div>
  );
}
function selectionAfter(
  signature: string,
  current: string | null,
  direction: number,
) {
  const ids = signature ? signature.split("|") : [];
  if (ids.length < 2) return current;
  const index = Math.max(0, ids.indexOf(current ?? ""));
  return ids[((index + direction) % ids.length + ids.length) % ids.length];
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

export function FeaturedBeats({ demos }: { demos?: AudioTrack[] }) {
  const player = useAudioTransport();
  const actions = useAudioActions();
  const demoMode = Boolean(demos?.length);
  const hostRef = useRef<HTMLDivElement>(null);
  const swipeRef = useRef<{
    id: number;
    x: number;
    y: number;
    horizontal: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const currentRef = useRef<HTMLDivElement>(null);
  const outgoingRef = useRef<HTMLDivElement>(null);
  const transitionLock = useRef(false);
  const queuedSteps = useRef(0);
  const restoreFocus = useRef(false);
  const finishRef = useRef<() => void>(() => {});
  const advanceRef = useRef<(direction: number) => void>(() => {});
  const [transition, setTransition] = useState<{ from: HeroSlide; direction: number } | null>(null);
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
  const second = useDiscountSecond();
  const now = second || discountNow();
  const visible: HeroSlide[] = demoMode
    ? demos!.map((audio) => ({ id: audio.id, label: "Listening room", audio }))
    : placements
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
  const signature = visible.map((placement) => placement.id).join("|");
  const selectedIndex = Math.max(
    0,
    visible.findIndex((placement) => placement.id === selectedId),
  );
  const selected = visible[selectedIndex];
  const selectedPlaying = Boolean(
    selected && player.track?.id === selected.audio.id && player.playing,
  );
  const rotating =
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

  function advance(direction: number) {
    if (!selected || visible.length < 2) return;
    if (transitionLock.current) { queuedSteps.current = Math.max(-10, Math.min(10, queuedSteps.current + direction)); return; }
    if (reducedMotion) { setSelectedId((current) => selectionAfter(signature, current, direction)); return; }
    restoreFocus.current = Boolean(currentRef.current?.contains(document.activeElement));
    transitionLock.current = true;
    setTransition({ from: selected, direction });
    setSelectedId(selectionAfter(signature, selected.id, direction));
  }
  function completeTransition() {
    transitionLock.current = false;
    if (reducedMotion) {
      const pending = queuedSteps.current;
      queuedSteps.current = 0;
      setTransition(null);
      if (pending) setSelectedId((current) => selectionAfter(signature, current, pending));
    } else if (queuedSteps.current) {
      const direction = Math.sign(queuedSteps.current);
      queuedSteps.current -= direction;
      advance(direction);
    } else setTransition(null);
  }
  useLayoutEffect(() => { finishRef.current = completeTransition; advanceRef.current = advance; });
  useLayoutEffect(() => {
    if (!transition) return;
    const incoming = currentRef.current;
    const outgoing = outgoingRef.current;
    if (!incoming || !outgoing) return;
    let alive = true;
    if (restoreFocus.current) { incoming.focus({ preventScroll: true }); restoreFocus.current = false; }
    const complete = () => { if (alive) finishRef.current(); };
    if (reducedMotion || typeof incoming.animate !== "function") { queueMicrotask(complete); return () => { alive = false; }; }
    const theme = getComputedStyle(hostRef.current!);
    const rawDuration = theme.getPropertyValue("--hero-slide-duration").trim();
    const duration = (parseFloat(rawDuration) || 560) * (rawDuration.endsWith("ms") || !rawDuration ? 1 : 1000);
    const easing = theme.getPropertyValue("--hero-slide-ease").trim() || "ease";
    const direction = transition.direction;
    const enter = incoming.animate([
      { opacity: .08, transform: "translate3d(" + direction * 105 + "%, 8px, 0) rotateY(" + -direction * 12 + "deg) scale(.92)" },
      { opacity: 1, transform: "translate3d(0, 0, 0) rotateY(0deg) scale(1)" },
    ], { duration, easing, fill: "both" });
    const exit = outgoing.animate([
      { opacity: 1, transform: "translate3d(0, 0, 0) rotateY(0deg) scale(1)" },
      { opacity: 0, transform: "translate3d(" + -direction * 105 + "%, -6px, 0) rotateY(" + direction * 12 + "deg) scale(.9)" },
    ], { duration, easing, fill: "both" });
    void enter.finished.then(complete).catch(() => {});
    return () => { alive = false; enter.cancel(); exit.cancel(); };
  }, [transition, reducedMotion]);
  useEffect(() => {
    if (!rotating || transition) return;
    const timer = setTimeout(() => advanceRef.current(1), 6000);
    return () => clearTimeout(timer);
  // The stable ID signature keeps the shared price clock from restarting rotation.
  }, [signature, rotating, selected?.id, transition]);

  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    advance(event.key === "ArrowLeft" ? -1 : 1);
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    if (
      event.target instanceof Element &&
      event.target.closest("button, input") &&
      !event.target.closest(".hero-featured-cover")
    )
      return;
    swipeRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      horizontal: false,
    };
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const swipe = swipeRef.current;
    if (!swipe || swipe.id !== event.pointerId) return;
    const x = event.clientX - swipe.x;
    const y = event.clientY - swipe.y;
    if (
      !swipe.horizontal &&
      Math.abs(x) > 10 &&
      Math.abs(x) > Math.abs(y) * 1.25
    ) {
      swipe.horizontal = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (swipe.horizontal) {
      suppressClick.current = true;
      event.currentTarget.style.setProperty(
        "--hero-swipe",
        `${Math.max(-40, Math.min(40, x * 0.3))}px`,
      );
    }
  }
  function finishSwipe(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const swipe = swipeRef.current;
    if (!swipe || swipe.id !== event.pointerId) return;
    swipeRef.current = null;
    event.currentTarget.style.setProperty("--hero-swipe", "0px");
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    const distance = event.clientX - swipe.x;
    if (!cancelled && swipe.horizontal && Math.abs(distance) > 36)
      advance(distance < 0 ? 1 : -1);
  }
  function clickCapture(event: MouseEvent<HTMLDivElement>) {
    if (event.detail !== 0 && suppressClick.current) {
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    }
  }
  function blur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  }
  function refresh() {
    setLoading(true);
    setRetry((value) => value + 1);
  }
  function playSelected() {
    if (selected)
      actions.toggle(
        selected.audio,
        visible.map((slide) => slide.audio),
      );
  }

  return (
    <div
      ref={hostRef}
      className="hero-featured"
      role="region"
      aria-roledescription="carousel"
      aria-label={
        demoMode ? "Featured listening demos" : "Featured sponsored beats"
      }
      aria-busy={loading}
      onKeyDown={keyboard}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={blur}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
    >
       
      {loading ? (
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
            className="hero-featured-deck"
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
            {visible.length > 2 && (
              <SideCard
                slide={
                  visible[(selectedIndex - 1 + visible.length) % visible.length]
                }
                side="previous"
              />
            )}
            {visible.length > 1 && (
              <SideCard
                slide={visible[(selectedIndex + 1) % visible.length]}
                side="next"
              />
            )}
            <div
              className="hero-featured-active-position"
              data-transitioning={Boolean(transition)}
              aria-live={rotating ? "off" : "polite"}
            >
              {transition && <div ref={outgoingRef} className="hero-featured-slide hero-featured-slide-outgoing" aria-hidden="true" inert><FeaturedCard selected={transition.from} selectedIndex={Math.max(0, visible.findIndex((slide) => slide.id === transition.from.id))} total={visible.length} selectedPlaying={player.track?.id === transition.from.audio.id && player.playing} onPlay={() => {}} now={now} /></div>}
              <div key={selected.id} ref={currentRef} className="hero-featured-slide hero-featured-slide-current" tabIndex={-1}>
                <FeaturedCard selected={selected} selectedIndex={selectedIndex} total={visible.length} selectedPlaying={selectedPlaying} onPlay={playSelected} now={now} />
              </div>
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
