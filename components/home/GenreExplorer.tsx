"use client";

import Image from "next/image";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import {
  NeumorphicButton,
  NeumorphicLink,
} from "@/components/ui/neumorphic/Button";
import { useLoopCarousel } from "@/components/ui/dynamic/useLoopCarousel";
import { getGenreStyles } from "@/lib/marketplace/genres";
import type { TaxonomyItem } from "@/lib/marketplace/types";

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

export function GenreExplorer() {
  const [categories, setCategories] = useState<TaxonomyItem[]>([]);
  const styles = getGenreStyles(categories).slice(0, 16);
  const columnCount = styles.length <= 4 ? styles.length : Math.ceil(styles.length / 2);
  const columns = Array.from({ length: columnCount }, (_, index) => styles.filter((_, styleIndex) => styleIndex === index || styleIndex === index + columnCount));
  const sectionRef = useRef<HTMLElement>(null);
  const moveRef = useRef<(direction: number, step?: number) => void>(() => {});
  const cooldown = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const id = useId();
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/taxonomy?kind=genres", { signal: controller.signal, cache: "no-store" }).then(async response => {
      if (!response.ok) return;
      const data = await response.json();
      if (!controller.signal.aborted && Array.isArray(data.items)) setCategories(data.items);
    }).catch(() => { /* Keep the existing style shortcuts when the catalog is unavailable. */ });
    return () => controller.abort();
  }, []);
  const {
    viewportRef,
    position,
    move,
    keyboard,
    pointerDown,
    pointerMove,
    finishDrag,
  } = useLoopCarousel(columns.length, 4);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);
  const [environment, setEnvironment] = useState({
    visible: false,
    hidden: false,
    reduced: true,
    covered: false,
    saveData: false,
  });
  const running =
    columns.length > 1 &&
    !hovered &&
    !focused &&
    !touching &&
    environment.visible &&
    !environment.hidden &&
    !environment.reduced &&
    !environment.covered &&
    !environment.saveData;

  useLayoutEffect(() => {
    moveRef.current = move;
  });
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let alive = true;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const device = navigator as Navigator & {
      connection?: { saveData?: boolean };
    };
    function preferences() {
      if (alive)
        setEnvironment((current) => ({
          ...current,
          hidden: document.hidden,
          reduced: motion.matches,
          saveData: Boolean(device.connection?.saveData),
        }));
    }
    function modal() {
      if (!alive) return;
      const covered = Boolean(
        document.querySelector(
          'dialog[open], [role="dialog"][aria-modal="true"]',
        ),
      );
      setEnvironment((current) =>
        current.covered === covered ? current : { ...current, covered },
      );
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (alive)
          setEnvironment((current) => ({
            ...current,
            visible: entry.isIntersecting,
          }));
      },
      { threshold: 0.08 },
    );
    observer.observe(section);
    const dialogs = new MutationObserver(modal);
    dialogs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["open", "aria-modal"],
    });
    motion.addEventListener("change", preferences);
    document.addEventListener("visibilitychange", preferences);
    queueMicrotask(() => {
      if (alive) {
        preferences();
        modal();
      }
    });
    return () => {
      alive = false;
      observer.disconnect();
      dialogs.disconnect();
      motion.removeEventListener("change", preferences);
      document.removeEventListener("visibilitychange", preferences);
      clearTimeout(cooldown.current);
    };
  }, []);
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => moveRef.current(1, 1), 4800);
    return () => clearTimeout(timer);
  }, [running, position.first]);

  function blur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  }
  function browse(event: KeyboardEvent<HTMLDivElement>) {
    if (
      event.target === event.currentTarget &&
      (event.key === "ArrowLeft" || event.key === "ArrowRight")
    ) {
      event.preventDefault();
      move(event.key === "ArrowRight" ? 1 : -1, 1);
    } else keyboard(event);
  }
  function touch() {
    clearTimeout(cooldown.current);
    setTouching(true);
    cooldown.current = setTimeout(() => setTouching(false), 9000);
  }

  return (
    <section
      ref={sectionRef}
      id="explore-genres"
      className="music-home-section genre-section"
      aria-labelledby="explore-genres-title"
      data-motion={running ? "running" : "paused"}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={blur}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
    >
      <div className="music-home-container">
        <div className="genre-panel">
          <header className="genre-heading">
            <div>
              <p className="genre-kicker">Browse by genre</p>
              <h2 id="explore-genres-title">
                Explore by <span>Style.</span>
              </h2>
            </div>
            <div className="genre-navigation" aria-label="Genre navigation">
              <NeumorphicButton
                className="genre-arrow"
                aria-label="Previous genres"
                disabled={columns.length < 2}
                aria-controls={id}
                onClick={() => move(-1, 1)}
              >
                <Chevron previous />
              </NeumorphicButton>
              <NeumorphicButton
                className="genre-arrow"
                aria-label="Next genres"
                disabled={columns.length < 2}
                aria-controls={id}
                onClick={() => move(1, 1)}
              >
                <Chevron />
              </NeumorphicButton>
            </div>
          </header>
          <div
            ref={viewportRef}
            id={id}
            className="genre-viewport"
            style={{ "--genre-column-count": columnCount } as CSSProperties}
            role="region"
            aria-roledescription="carousel"
            aria-label="Music styles. Swipe or use the arrow buttons to explore."
            tabIndex={0}
            onKeyDown={browse}
            onPointerDown={(event) => {
              if (event.pointerType === "touch") touch();
              pointerDown(event);
            }}
            onPointerMove={pointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            onLostPointerCapture={finishDrag}
          >
            {[0, 1, 2]
              .flatMap((copy) =>
                columns.map((styles, index) => ({
                  styles,
                  slot: copy * columns.length + index,
                })),
              )
              .map(({ styles, slot }) => (
                <div
                  key={slot}
                  data-carousel-item={slot}
                  className="genre-column"
                  inert={slot < position.from || slot > position.to}
                  aria-hidden={slot < position.from || slot > position.to}
                >
                  {styles.map((style) => (
                    <NeumorphicLink
                      key={style.slug}
                      href={`/marketplace?genre=${style.slug}`}
                      prefetch={false}
                      variant="quiet"
                      className="genre-card"
                      aria-label={`Explore ${style.name} beats`}
                    >
                      <span className={`genre-art genre-art-${style.art}`}>
                        <Image
                          src={style.thumbnailUrl ?? `/assets/genres/${style.art}.svg`}
                          alt=""
                          fill
                          unoptimized
                          draggable={false}
                          sizes="(max-width:699px) 44vw, (max-width:999px) 30vw, 300px"
                        />
                      </span>
                      <span className="genre-card-copy">
                        <strong>{style.name}</strong>
                        <span>{style.description}</span>
                      </span>
                      <span className="genre-card-arrow" aria-hidden="true">
                        <Chevron />
                      </span>
                    </NeumorphicLink>
                  ))}
                </div>
              ))}
          </div>
          <p
            className="sr-only"
            role="status"
            aria-live={running ? "off" : "polite"}
          >
            Showing {Array.from({ length: position.visible }, (_, offset) => columns[(position.first + offset) % columns.length]?.length ?? 0).reduce((sum, count) => sum + count, 0)} music styles.{" "}
            {Array.from({ length: position.visible }, (_, offset) =>
              columns[(position.first + offset) % columns.length]
                .map((style) => style.name)
                .join(" and "),
            ).join(", ")}
            .
          </p>
        </div>
      </div>
    </section>
  );
}
