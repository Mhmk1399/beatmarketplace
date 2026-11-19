"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";

export type HeroSlotElements = { layout: HTMLDivElement; motion: HTMLDivElement; resize: HTMLDivElement; scale: HTMLDivElement };
export type HeroSlotPosition = -2 | -1 | 0 | 1 | 2;
type Snapshot = { rect: DOMRect; opacity: number; position: HeroSlotPosition };
const wrap = (index: number, count: number) => (index % count + count) % count;

export function heroSlotPosition(index: number, active: number, count: number): HeroSlotPosition {
  if (!count) return 0;
  let difference = wrap(index - active, count);
  if (difference > count / 2) difference -= count;
  return Math.max(-2, Math.min(2, difference)) as HeroSlotPosition;
}

/** The supplied carousel's FLIP layers: snapshot first, then translate and resize separately. */
export function useHeroCarouselMotion(signature: string, activeId: string | undefined, select: (id: string) => void, reducedMotion: boolean) {
  const ids = useMemo(() => signature ? signature.split("|") : [], [signature]);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const slotsRef = useRef(new Map<string, HeroSlotElements>());
  const snapshotRef = useRef(new Map<string, Snapshot>());
  const pointerRef = useRef<{ id: number; x: number; y: number; time: number; horizontal: boolean } | null>(null);
  const dragFrame = useRef(0);
  const pendingX = useRef(0);
  const suppressClick = useRef(false);
  const suppressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const restoreFocus = useRef(false);
  const [revision, setRevision] = useState(0);
  const [dragging, setDragging] = useState(false);
  const positions = useMemo(() => {
    const active = Math.max(0, ids.indexOf(activeId ?? ""));
    return ids.map((id, index) => ({ id, position: heroSlotPosition(index, active, ids.length) }));
  }, [ids, activeId]);
  const registerSlot = useCallback((id: string, elements: HeroSlotElements | null) => {
    if (elements) slotsRef.current.set(id, elements); else slotsRef.current.delete(id);
  }, []);

  function commitDrag(value: number) {
    pendingX.current = value;
    cancelAnimationFrame(dragFrame.current); dragFrame.current = 0;
    if (trackRef.current) trackRef.current.style.transform = `translate3d(${value}px, 0, 0)`;
  }
  function capture() {
    const snapshot = new Map<string, Snapshot>();
    positions.forEach(({ id, position }) => {
      const elements = slotsRef.current.get(id);
      if (elements) snapshot.set(id, { rect: elements.scale.getBoundingClientRect(), opacity: Number.parseFloat(getComputedStyle(elements.motion).opacity) || 0, position });
    });
    // Preserve the current on-screen geometry even when an earlier transition is interrupted.
    slotsRef.current.forEach(({ motion, resize }) => {
      motion.getAnimations().forEach((animation) => animation.cancel());
      resize.getAnimations().forEach((animation) => animation.cancel());
    });
    snapshotRef.current = snapshot;
  }
  function goTo(id: string) {
    if (!ids.includes(id)) return;
    const focused = document.activeElement;
    restoreFocus.current = Boolean(focused && slotsRef.current.get(activeId ?? "")?.layout.contains(focused));
    capture();
    commitDrag(0);
    select(id);
    setRevision((value) => value + 1);
  }
  function advance(direction: number) {
    if (ids.length < 2) return;
    goTo(ids[wrap(Math.max(0, ids.indexOf(activeId ?? "")) + direction, ids.length)]);
  }

  useLayoutEffect(() => {
    const snapshot = snapshotRef.current;
    if (!snapshot.size) { if (stageRef.current) stageRef.current.dataset.animating = "false"; return; }
    const animations: Animation[] = [];
    let alive = true;
    const stage = stageRef.current;
    const theme = stage ? getComputedStyle(stage) : null;
    const milliseconds = (name: string, fallback: number) => {
      const raw = theme?.getPropertyValue(name).trim() ?? "";
      const value = parseFloat(raw);
      return Number.isFinite(value) ? Math.max(0, Math.min(2000, value * (raw.endsWith("ms") ? 1 : 1000))) : fallback;
    };
    const duration = milliseconds("--hero-slide-duration", 540);
    const resizeDuration = milliseconds("--hero-slide-resize-duration", 340);
    const easing = theme?.getPropertyValue("--hero-slide-ease").trim() || "cubic-bezier(0.16, 1, 0.3, 1)";
    const resizeEasing = theme?.getPropertyValue("--hero-slide-resize-ease").trim() || "cubic-bezier(0.22, 1, 0.36, 1)";

    positions.forEach(({ id, position }) => {
      const previous = snapshot.get(id);
      const elements = slotsRef.current.get(id);
      if (!previous || !elements) return;
      const finalRect = elements.scale.getBoundingClientRect();
      if (!finalRect.width || !finalRect.height || reducedMotion || typeof elements.motion.animate !== "function") return;
      const opacity = Number.parseFloat(getComputedStyle(elements.motion).opacity) || 0;
      if (!previous.opacity && !opacity) return;
      const deltaX = previous.rect.left + previous.rect.width / 2 - finalRect.left - finalRect.width / 2;
      const deltaY = previous.rect.top + previous.rect.height / 2 - finalRect.top - finalRect.height / 2;
      const resizeX = previous.rect.width / finalRect.width;
      const resizeY = previous.rect.height / finalRect.height;
      if (!Number.isFinite(resizeX) || !Number.isFinite(resizeY)) return;
      const startTransform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
      const endTransform = "translate3d(0, 0, 0)";
      const crossesBoundary = Math.abs(previous.position - position) >= (ids.length < 5 ? 2 : 3);
      if (Math.abs(deltaX) > .5 || Math.abs(deltaY) > .5 || Math.abs(previous.opacity - opacity) > .01) {
        const frames: Keyframe[] = crossesBoundary ? [
          { transform: startTransform, opacity: previous.opacity, offset: 0 },
          { transform: `translate3d(${deltaX + (previous.position < 0 ? -64 : 64)}px, ${deltaY}px, 0)`, opacity: 0, offset: .28 },
          { transform: `translate3d(${position < 0 ? -64 : 64}px, 0, 0)`, opacity: 0, offset: .32 },
          { transform: endTransform, opacity, offset: 1 },
        ] : [{ transform: startTransform, opacity: previous.opacity }, { transform: endTransform, opacity }];
        animations.push(elements.motion.animate(frames, { duration, easing, fill: "both" }));
      }
      if (Math.abs(resizeX - 1) > .002 || Math.abs(resizeY - 1) > .002) {
        animations.push(elements.resize.animate([{ transform: `scale3d(${resizeX}, ${resizeY}, 1)` }, { transform: "scale3d(1, 1, 1)" }], { duration: resizeDuration, easing: resizeEasing, fill: "both" }));
      }
    });
    snapshotRef.current = new Map();
    if (restoreFocus.current) { slotsRef.current.get(activeId ?? "")?.layout.focus({ preventScroll: true }); restoreFocus.current = false; }
    if (stage) stage.dataset.animating = animations.length ? "true" : "false";
    const finished = animations.map((animation) => {
      const completion = animation.finished;
      void completion.then(() => { if (alive) animation.cancel(); }).catch(() => {});
      return completion;
    });
    void Promise.all(finished).then(() => { if (alive && stage) stage.dataset.animating = "false"; }).catch(() => {});
    return () => { alive = false; animations.forEach((animation) => animation.cancel()); };
  }, [revision, positions, reducedMotion, ids.length, activeId]);

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    suppressClick.current = false; clearTimeout(suppressTimer.current);
    if (!event.isPrimary || event.button !== 0 || (event.target instanceof Element && event.target.closest("button, a, input, select, textarea") && !event.target.closest(".hero-featured-cover"))) return;
    slotsRef.current.forEach(({ motion, resize }) => [...motion.getAnimations(), ...resize.getAnimations()].forEach((animation) => { if (animation.playState === "running") animation.pause(); }));
    pointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp, horizontal: false };
    commitDrag(0); setDragging(true);
  }
  function resisted(delta: number) {
    const distance = Math.max(180, (stageRef.current?.clientWidth ?? 400) * .55);
    return delta / (1 + Math.abs(delta) / distance);
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    const x = event.clientX - pointer.x, y = event.clientY - pointer.y;
    if (!pointer.horizontal && Math.abs(x) > 10 && Math.abs(x) > Math.abs(y) * 1.25) { pointer.horizontal = true; event.currentTarget.setPointerCapture(event.pointerId); }
    if (!pointer.horizontal) return;
    pendingX.current = resisted(x);
    if (!dragFrame.current) dragFrame.current = requestAnimationFrame(() => { dragFrame.current = 0; if (trackRef.current) trackRef.current.style.transform = `translate3d(${pendingX.current}px, 0, 0)`; });
  }
  function finishSwipe(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    const x = pointer.horizontal ? event.clientX - pointer.x : 0;
    const velocity = x / Math.max(1, event.timeStamp - pointer.time);
    const threshold = Math.min(90, Math.max(38, (stageRef.current?.clientWidth ?? 400) * .08));
    commitDrag(resisted(x));
    if (Math.abs(x) > 8) { suppressClick.current = true; suppressTimer.current = setTimeout(() => { suppressClick.current = false; }, 300); }
    pointerRef.current = null; setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const direction = !cancelled && (x < -threshold || velocity < -.55) ? 1 : !cancelled && (x > threshold || velocity > .55) ? -1 : 0;
    if (ids.length) goTo(ids[wrap(Math.max(0, ids.indexOf(activeId ?? "")) + direction, ids.length)]);
  }
  function clickCapture(event: MouseEvent<HTMLDivElement>) {
    if (event.detail && suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; clearTimeout(suppressTimer.current); }
  }
  useEffect(() => {
    const slots = slotsRef.current;
    return () => { cancelAnimationFrame(dragFrame.current); clearTimeout(suppressTimer.current); slots.forEach(({ motion, resize }) => [...motion.getAnimations(), ...resize.getAnimations()].forEach((animation) => animation.cancel())); };
  }, []);
  return { stageRef, trackRef, positions, registerSlot, advance, dragging, pointerDown, pointerMove, finishSwipe, clickCapture };
}
