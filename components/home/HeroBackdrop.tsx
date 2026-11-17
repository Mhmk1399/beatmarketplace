"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { HeroBackdropController } from "./HeroBackdropScene";

const vectorRibbons = Array.from({ length: 31 }, (_, index) => {
  const layer = index < 12 ? 0 : index < 23 ? 1 : 2;
  const b = ((index % (layer === 0 ? 12 : 11)) / 11 - .5) * 2;
  return Array.from({ length: 121 }, (_, point) => {
    const s = point / 120;
    let x: number;
    let y: number;
    if (layer === 0) { x = -160 + s * 1760; y = 700 + Math.sin(s * 5.7) * 65 + b * Math.cos(s * 8) * 72; }
    else if (layer === 1) { const a = s * 6 - .65; x = 1180 + Math.cos(a) * 470 + Math.sin(a * 2) * 80 + b * Math.cos(a * 2) * 65; y = 270 + Math.sin(a) * 360 + b * Math.sin(a * 2) * 75; }
    else { x = -120 + s * 1700; y = -12 - Math.sin(s * 7.4) * 65 + Math.pow(Math.sin(s * Math.PI), 2) * 130 + b * Math.cos(s * 5) * 65; }
    return `${point ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
});

/** The background follows the section, so controls and mobile scrolling stay native. */
export function HeroBackdrop() {
  const layerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(false);
  const [ready, setReady] = useState(false);
  const gradientId = useId();

  useEffect(() => {
    const layer = layerRef.current;
    const host = hostRef.current;
    const section = layer?.closest<HTMLElement>("[data-hero-space]") ?? layer?.closest("section");
    if (!layer || !host || !section) return;
    let alive = true;
    let started = false;
    let scene: HeroBackdropController | undefined;
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let top = 0;
    let height = 1;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motion.matches;
    const device = navigator as Navigator & { connection?: { saveData?: boolean } };

    function fallbackScroll() {
      if (readyRef.current || reducedMotion) return;
      const progress = Math.max(0, Math.min(1, (window.innerHeight * .18 - (top - window.scrollY)) / (height * .9)));
      layer!.style.setProperty("--hero-scrub", progress.toFixed(3));
    }
    function resizeFallback() {
      const bounds = section!.getBoundingClientRect();
      top = bounds.top + window.scrollY;
      height = Math.max(1, bounds.height);
      fallbackScroll();
    }
    function fallbackPointer(event: PointerEvent) {
      if (readyRef.current || reducedMotion || event.pointerType === "touch") return;
      const bounds = section!.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
      layer!.style.setProperty("--hero-pointer-x", x.toFixed(3));
      layer!.style.setProperty("--hero-pointer-y", y.toFixed(3));
    }
    function resetFallback() {
      layer!.style.setProperty("--hero-pointer-x", "0");
      layer!.style.setProperty("--hero-pointer-y", "0");
    }
    function changeMotion() {
      reducedMotion = motion.matches;
      scene?.syncMotion();
      if (reducedMotion) resetFallback();
      else resizeFallback();
    }
    function load() {
      if (!alive || started || device.connection?.saveData) return;
      started = true;
      void import("./HeroBackdropScene").then(({ createHeroBackdropScene }) => {
        if (!alive || !host || !section) return;
        try {
          scene = createHeroBackdropScene(host, { section, motion, onState: (next) => { if (alive) { readyRef.current = next; setReady(next); if (!next) resizeFallback(); } } });
        } catch { readyRef.current = false; setReady(false); }
      }).catch(() => { /* The section keeps its vector background when the optional chunk fails. */ });
    }
    // Own the listener before the lazy GPU chunk loads, including its fallback.
    motion.addEventListener("change", changeMotion);
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      if ("requestIdleCallback" in window) idleId = window.requestIdleCallback(load, { timeout: 1400 });
      else timeoutId = setTimeout(load, 160);
    }, { rootMargin: "160px" });
    observer.observe(section);
    const resizeObserver = new ResizeObserver(resizeFallback);
    resizeObserver.observe(section);
    section.addEventListener("pointermove", fallbackPointer, { passive: true });
    section.addEventListener("pointerleave", resetFallback, { passive: true });
    window.addEventListener("scroll", fallbackScroll, { passive: true });
    resizeFallback();
    return () => {
      alive = false;
      observer.disconnect(); resizeObserver.disconnect();
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      scene?.dispose();
      readyRef.current = false;
      section.removeEventListener("pointermove", fallbackPointer);
      section.removeEventListener("pointerleave", resetFallback);
      window.removeEventListener("scroll", fallbackScroll);
      motion.removeEventListener("change", changeMotion);
    };
  }, []);

  return <div ref={layerRef} className="hero-backdrop" data-renderer={ready ? "webgl" : "vector"} aria-hidden="true">
    <div className="hero-backdrop-haze" />
    <svg className="hero-backdrop-vector" viewBox="0 0 1440 800" preserveAspectRatio="none" fill="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="800" x2="1440" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="var(--hero-ribbon-violet)" /><stop offset=".55" stopColor="var(--hero-ribbon-pink)" /><stop offset="1" stopColor="var(--hero-ribbon-highlight)" /></linearGradient>
        <filter id={`${gradientId}-glow`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.5" /></filter>
      </defs>
      <g filter={`url(#${gradientId}-glow)`}>{vectorRibbons.filter((_, index) => index % 5 === 0).map((path, index) => <path key={index} d={path} stroke={`url(#${gradientId})`} strokeWidth="8" opacity=".5" />)}</g>
      {vectorRibbons.map((path, index) => <path key={index} d={path} stroke={`url(#${gradientId})`} strokeWidth={index % 5 === 0 ? 2 : 1.6} strokeDasharray={index % 5 === 0 ? undefined : "1 6"} strokeLinecap="round" opacity={index % 5 === 0 ? .55 : .8} />)}
    </svg>
    <div ref={hostRef} className="hero-backdrop-renderer" />
    <div className="hero-backdrop-shade" />
  </div>;
}
