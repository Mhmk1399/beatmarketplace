"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

const modulo = (value: number, count: number) => (value % count + count) % count;

/** Three bounded copies keep native touch momentum and smooth scrolling across a seam. */
export function useLoopCarousel(count: number) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const metrics = useRef({ stride: 0, visible: 1 });
  const publishRef = useRef<() => void>(() => {});
  const dragRef = useRef<{ id: number; x: number; left: number; moved: boolean } | null>(null);
  const focusRef = useRef<{ slot: number; control: number } | null>(null);
  const [position, setPosition] = useState({ first: 0, visible: 1, from: count, to: count });

  useLayoutEffect(() => {
    const target = focusRef.current;
    if (!target) return;
    const card = viewportRef.current?.querySelector<HTMLElement>(`[data-carousel-item="${target.slot}"]`);
    if (!card || card.inert) return;
    card.querySelectorAll<HTMLElement>("button, a, input")[target.control]?.focus({ preventScroll: true });
    focusRef.current = null;
  }, [position.from, position.to]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !count) return;
    let frame = 0;
    let settle: ReturnType<typeof setTimeout> | undefined;

    function publish() {
      frame = 0;
      const { stride, visible } = metrics.current;
      if (!stride) return;
      const progress = viewport!.scrollLeft / stride;
      const from = Math.max(0, Math.floor(progress + .002));
      const to = Math.min(count * 3 - 1, Math.ceil(progress + visible - 1 - .002));
      const first = modulo(Math.round(progress) - count, count);
      setPosition((previous) => previous.first === first && previous.visible === visible && previous.from === from && previous.to === to ? previous : { first, visible, from, to });
    }
    publishRef.current = publish;

    function normalize() {
      if (dragRef.current || !metrics.current.stride) return;
      const cycle = metrics.current.stride * count;
      const left = viewport!.scrollLeft;
      const shift = left < cycle - .75 ? cycle : left >= cycle * 2 - .75 ? -cycle : 0;
      if (!shift) return;
      const focused = document.activeElement;
      const card = focused instanceof HTMLElement && viewport!.contains(focused) ? focused.closest<HTMLElement>("[data-carousel-item]") : null;
      if (card) focusRef.current = { slot: Number(card.dataset.carouselItem) + Math.round(shift / metrics.current.stride), control: Array.from(card.querySelectorAll("button, a, input")).indexOf(focused as HTMLElement) };
      // The pixels are identical at this offset; never animate the reset itself.
      viewport!.scrollTo({ left: left + shift, behavior: "instant" });
      publish();
    }
    function scroll() {
      if (!frame) frame = requestAnimationFrame(publish);
      clearTimeout(settle);
      settle = setTimeout(normalize, 140);
    }
    function configure() {
      const card = viewport!.querySelector<HTMLElement>("[data-carousel-item]");
      if (!card) return;
      const gap = parseFloat(getComputedStyle(viewport!).columnGap) || 0;
      const stride = card.getBoundingClientRect().width + gap;
      if (!stride) return;
      const oldStride = metrics.current.stride;
      const first = oldStride ? modulo(Math.round(viewport!.scrollLeft / oldStride) - count, count) : 0;
      const visible = Math.max(1, Math.min(count, 2, Math.round((viewport!.clientWidth + gap) / stride)));
      metrics.current = { stride, visible };
      viewport!.scrollTo({ left: (count + first) * stride, behavior: "instant" });
      publish();
    }
    const observer = new ResizeObserver(configure);
    observer.observe(viewport);
    viewport.addEventListener("scroll", scroll, { passive: true });
    viewport.addEventListener("scrollend", normalize);
    configure();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); clearTimeout(settle); viewport.removeEventListener("scroll", scroll); viewport.removeEventListener("scrollend", normalize); publishRef.current = () => {}; };
  }, [count]);

  function scrollPhysical(index: number) {
    const viewport = viewportRef.current;
    if (!viewport || !metrics.current.stride) return;
    viewport.scrollTo({ left: index * metrics.current.stride, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  function move(direction: number) {
    const viewport = viewportRef.current;
    const { stride, visible } = metrics.current;
    if (!viewport || !stride || count < 2) return;
    // Rebase even rapid repeated clicks before a target could reach a physical end.
    let progress = viewport.scrollLeft / stride;
    if (progress < count || progress >= count * 2) {
      progress = count + modulo(progress - count, count);
      viewport.scrollTo({ left: progress * stride, behavior: "instant" });
      publishRef.current();
    }
    scrollPhysical(Math.round(progress) + direction * visible);
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") scrollPhysical(count);
    else if (event.key === "End") scrollPhysical(count * 2 - 1);
    else move(event.key === "ArrowRight" ? 1 : -1);
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0 || (event.target instanceof Element && event.target.closest("button, a, input"))) return;
    dragRef.current = { id: event.pointerId, x: event.clientX, left: event.currentTarget.scrollLeft, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    if (Math.abs(event.clientX - drag.x) > 7) drag.moved = true;
    if (!drag.moved) return;
    event.currentTarget.style.scrollSnapType = "none";
    event.currentTarget.style.scrollBehavior = "auto";
    event.currentTarget.dataset.dragging = "true";
    event.currentTarget.scrollLeft = drag.left - (event.clientX - drag.x);
  }
  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId || event.target !== event.currentTarget) return;
    dragRef.current = null;
    const viewport = event.currentTarget;
    viewport.style.removeProperty("scroll-snap-type");
    viewport.style.removeProperty("scroll-behavior");
    delete viewport.dataset.dragging;
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    if (drag.moved && metrics.current.stride) scrollPhysical(Math.round(viewport.scrollLeft / metrics.current.stride));
  }
  return { viewportRef, position, move, keyboard, pointerDown, pointerMove, finishDrag };
}
