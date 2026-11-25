"use client";

import { CoverImage } from "@/components/ui/CoverImage";
import { trackHref } from "@/lib/marketplace/track-url";
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
import { synchronizeDiscountClock, useDiscountSecond } from "@/components/discounts/clock";
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
import type { PublicHeroPlacement } from "@/lib/hero/types";

export type FeaturedBeatsProps = {
  placements: PublicHeroPlacement[];
  tracks: MarketplaceTrack[];
  serverTime: string;
};

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
  beat: MarketplaceTrack;
  sponsored: boolean;
};

function Cover({ audio }: { audio: AudioTrack }) {
  return audio.coverUrl ? (
    <CoverImage
      src={audio.coverUrl}
      alt={`${audio.title} cover artwork`}
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
function FeaturedCard({ slide, index, total, playing, onPlay, now }: { slide: HeroSlide; index: number; total: number; playing: boolean; onPlay: () => void; now: number }) {
  const { beat, audio, label, sponsored } = slide;
  const href = trackHref(beat);
  const cheapest = beat.licenses
    .filter(license => license.licenseType === "NON_EXCLUSIVE" && license.formats.length > 0 && license.formats.every(format => format === "WAV"))
    .sort((a, b) => effectiveLicensePrice(a, now) - effectiveLicensePrice(b, now))[0];

  return (
    <article className="hero-featured-card hero-featured-card-main" role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${total}: ${audio.title}`}>
      <div className="hero-featured-card-top">
        <span>{label || "Producer spotlight"}</span>
        {sponsored && <span className="hero-featured-sponsored">Sponsored</span>}
      </div>
      <div className="hero-featured-art">
        <Link href={href} className="hero-featured-cover" aria-label={`View ${audio.title} and licenses`} draggable={false}>
          <Cover audio={audio} />
        </Link>
        <AudioFavoriteButton track={audio} className="hero-featured-favorite" />
      </div>
      <div className="hero-featured-track-row">
        <div className="hero-featured-track-copy">
          <h3><Link href={href}>{audio.title}</Link></h3>
          <p>{audio.artist}</p>
        </div>
        <NeumorphicButton variant="accent" className="hero-featured-play" aria-label={`${playing ? "Pause" : "Play"} featured beat ${audio.title}`} aria-pressed={playing} disabled={!audio.src} onClick={onPlay}>
          {playing ? <PlayerPauseIcon /> : <PlayerPlayIcon />}
        </NeumorphicButton>
      </div>
      <p className="hero-featured-metadata">
        <span>{beat.genre?.name || "Original beat"}</span>
        <span>{beat.bpm} BPM</span>
        <span>{beat.musicalKey}</span>
      </p>
      <div className="hero-featured-price">
        {cheapest ? <><span>License from</span><LicensePrice license={cheapest} /></> : <Link href={href}>View licenses</Link>}
      </div>
      <div className="hero-featured-audio">
        <div><TrackSpectrum trackId={audio.id} variant="bars" /></div>
        <span>30s preview</span>
      </div>
    </article>
  );
}

export function FeaturedBeats({ placements, tracks, serverTime }: FeaturedBeatsProps) {
  const player = useAudioTransport();
  const actions = useAudioActions();
  const hostRef = useRef<HTMLDivElement>(null);
  const advanceRef = useRef<(direction: number) => void>(() => {});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [autoPaused, setAutoPaused] = useState(false);
  const second = useDiscountSecond();
  const now = second || Date.parse(serverTime);
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
          sponsored: true,
        }));
  const visible: HeroSlide[] = sponsored.length ? sponsored : tracks.filter(beat => beat.previewUrl).slice(0, 5).map(beat => ({
    id: beat.id, label: "New release", audio: marketplaceAudioTrack(beat), beat, sponsored: false,
  }));
  const queue = visible.map(item => item.audio);
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

  useEffect(() => { synchronizeDiscountClock(serverTime); }, [serverTime]);

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

  return (
    <div
      ref={hostRef}
      className="hero-featured"
      role="region"
      aria-roledescription="carousel"
      aria-label={
        sponsored.length ? "Featured sponsored beats" : "Recent beats"
      }
      onKeyDown={keyboard}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={blur}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
    >
      {selected && <div className="hero-featured-heading">
        <div><h2>{sponsored.length ? "Producer spotlight" : "Recent releases"}</h2><p className="hero-featured-context">30-second previews</p></div>
        <div className="hero-featured-tools"><span className="hero-featured-counter">{String(selectedIndex + 1).padStart(2,"0")} / {String(visible.length).padStart(2,"0")}</span>
          <NeumorphicButton variant="quiet" size="sm" className="hero-featured-auto" disabled={visible.length < 2 || reducedMotion} aria-label={autoPaused ? "Resume automatic featured slides" : "Pause automatic featured slides"} aria-pressed={autoPaused} onClick={()=>setAutoPaused(value=>!value)}>{autoPaused ? <PlayerPlayIcon/> : <PlayerPauseIcon/>}</NeumorphicButton>
        </div>
      </div>}
      {!selected ? (
        <div className="hero-featured-placeholder">
          <MusicNoteIcon />
          <p className="hero-featured-empty-kicker">
            Independent sound. New possibilities.
          </p>
          <h3>Your next discovery is waiting.</h3>
          <p>Explore original beats and find the sound that speaks to you.</p>
          <div className="hero-featured-empty-actions">
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
                  <FeaturedCard slide={slide} index={index} total={visible.length} playing={player.track?.id === slide.audio.id && player.playing} onPlay={() => actions.toggle(slide.audio, queue)} now={now} />
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
