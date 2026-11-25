"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { HeroBackdropController } from "./HeroBackdropScene";

const ribbons = [
  "M-120 660C170 520 313 795 640 686S1150 520 1540 670",
  "M710 345C580 122 924-33 1200 86S1525 438 1220 532 801 546 710 345Z",
  "M-80 30C235 202 453-58 726 109S1176 141 1510-21",
  "M-100 512C286 632 518 293 796 510S1197 566 1515 424",
  "M780 335C727 212 967 168 1163 265S1335 523 1095 556 830 455 780 335Z",
];

const sparks = [[81, 154], [150, 586], [269, 106], [318, 490], [402, 695], [476, 164], [520, 634], [575, 415], [626, 59], [697, 721], [820, 548], [935, 121], [1058, 644], [1120, 72], [1236, 604], [1310, 158], [1365, 438]];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** The background follows the section, so controls and mobile scrolling stay native. */
export function HeroBackdrop() {
  const layerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(false);
  const [ready, setReady] = useState(false);
  const artId = useId();

  useEffect(() => {
    const layer = layerRef.current;
    const host = hostRef.current;
    const section = layer?.closest<HTMLElement>("[data-hero-space]") ?? layer?.closest("section");
    if (!layer || !host || !section) return;
    let alive = true;
    let started = false;
    let visible = false;
    let scene: HeroBackdropController | undefined;
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    let top = 0;
    let left = 0;
    let width = 1;
    let height = 1;
    let pointerX = 0;
    let pointerY = 0;
    let variant = 0;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motion.matches;
    const device = navigator as Navigator & { connection?: { saveData?: boolean } };

    function queueFallback() {
      if (frame || !visible || readyRef.current || reducedMotion) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (readyRef.current || reducedMotion) return;
        const progress = clamp((window.innerHeight * .18 + window.scrollY - top) / (height * .86), 0, 1);
        layer!.style.setProperty("--hero-scrub", progress.toFixed(3));
        layer!.style.setProperty("--hero-pointer-x", pointerX.toFixed(3));
        layer!.style.setProperty("--hero-pointer-y", pointerY.toFixed(3));
        layer!.style.setProperty("--hero-variant", String(variant));
      });
    }

    function resizeFallback() {
      if (readyRef.current) return;
      const bounds = section!.getBoundingClientRect();
      top = bounds.top + window.scrollY;
      left = bounds.left;
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      queueFallback();
    }

    function fallbackPointer(event: PointerEvent) {
      if (readyRef.current || reducedMotion) return;
      pointerX = clamp((event.clientX - left) / width * 2 - 1, -1, 1);
      pointerY = clamp((event.clientY + window.scrollY - top) / height * 2 - 1, -1, 1);
      queueFallback();
    }

    function pointerMove(event: PointerEvent) {
      if (event.pointerType !== "touch") fallbackPointer(event);
    }

    function pointerDown(event: PointerEvent) {
      if (readyRef.current || reducedMotion || !event.isPrimary || event.button !== 0 || (event.target instanceof Element && event.target.closest("a, button, input, select, textarea, [role='button']"))) return;
      variant = (variant + 1) % 3;
      fallbackPointer(event);
    }

    function resetFallback() { pointerX = pointerY = 0; queueFallback(); }

    function load() {
      idleId = timeoutId = undefined;
      if (!alive || started || !visible || reducedMotion || device.connection?.saveData) return;
      started = true;
      void import("./HeroBackdropScene").then(({ createHeroBackdropScene }) => {
        if (!alive || !host || !section) return;
        try {
          scene = createHeroBackdropScene(host, { section, motion, onState: (next) => {
            if (!alive) return;
            readyRef.current = next;
            setReady(next);
            if (!next) resizeFallback();
          } });
        } catch { /* Keep the vector artwork if a renderer cannot be created. */ }
      }).catch(() => { /* Keep the vector artwork if the optional chunk fails. */ });
    }

    function requestScene() {
      if (!visible || started || reducedMotion || device.connection?.saveData || idleId !== undefined || timeoutId !== undefined) return;
      if ("requestIdleCallback" in window) idleId = window.requestIdleCallback(load, { timeout: 1200 });
      else timeoutId = setTimeout(load, 150);
    }

    function changeMotion() {
      reducedMotion = motion.matches;
      scene?.syncMotion();
      resizeFallback();
      requestScene();
    }

    motion.addEventListener("change", changeMotion);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) { resizeFallback(); requestScene(); }
    }, { rootMargin: "120px" });
    observer.observe(section);
    const resizeObserver = new ResizeObserver(resizeFallback);
    resizeObserver.observe(section);
    section.addEventListener("pointermove", pointerMove, { passive: true });
    section.addEventListener("pointerdown", pointerDown, { passive: true });
    section.addEventListener("pointerleave", resetFallback, { passive: true });
    window.addEventListener("scroll", queueFallback, { passive: true });
    resizeFallback();
    return () => {
      alive = false;
      observer.disconnect(); resizeObserver.disconnect();
      cancelAnimationFrame(frame);
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      scene?.dispose();
      readyRef.current = false;
      section.removeEventListener("pointermove", pointerMove);
      section.removeEventListener("pointerdown", pointerDown);
      section.removeEventListener("pointerleave", resetFallback);
      window.removeEventListener("scroll", queueFallback);
      motion.removeEventListener("change", changeMotion);
    };
  }, []);

  return <div ref={layerRef} className="hero-backdrop" data-renderer={ready ? "webgl" : "vector"} aria-hidden="true">
    <div className="hero-backdrop-haze" />
    <svg className="hero-backdrop-vector" viewBox="0 0 1440 800" preserveAspectRatio="none" fill="none">
      <defs>
        <linearGradient id={artId} x1="0" y1="730" x2="1440" y2="130" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--hero-ribbon-violet)" stopOpacity=".44" />
          <stop offset=".55" stopColor="var(--hero-ribbon-pink)" stopOpacity=".78" />
          <stop offset="1" stopColor="var(--hero-ribbon-highlight)" />
        </linearGradient>
        {ribbons.map((path, index) => <path key={path} id={`${artId}-ribbon-${index}`} d={path} />)}
      </defs>
      <g stroke={`url(#${artId})`}>
        {ribbons.map((path, index) => <g key={path}>
          <use href={`#${artId}-ribbon-${index}`} strokeWidth="10" opacity=".08" />
          <use href={`#${artId}-ribbon-${index}`} strokeWidth="1.5" opacity={index === 1 ? ".66" : ".42"} />
          <use href={`#${artId}-ribbon-${index}`} y="-16" strokeWidth="2" strokeDasharray="1 7" strokeLinecap="round" opacity=".58" />
          <use href={`#${artId}-ribbon-${index}`} y="21" strokeWidth="2" strokeDasharray="1 9" strokeLinecap="round" opacity=".37" />
        </g>)}
      </g>
      <g fill="var(--hero-ribbon-highlight)">
        {sparks.map(([x, y], index) => <circle key={x} cx={x} cy={y} r={index % 4 === 0 ? 1.9 : 1.25} opacity={index % 4 === 0 ? ".52" : ".27"} />)}
      </g>
    </svg>
    <div ref={hostRef} className="hero-backdrop-renderer" />
    <div className="hero-backdrop-shade" />
  </div>;
}
