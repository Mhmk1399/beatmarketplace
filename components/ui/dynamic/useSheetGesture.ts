"use client";

import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent, type RefObject } from "react";

type SheetOptions = {
  enabled: boolean;
  open: boolean;
  panelRef: RefObject<HTMLDivElement | null>;
  backdropRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
};
type Drag = {
  pointerId: number;
  originX: number;
  originY: number;
  lastY: number;
  lastTime: number;
  distance: number;
  velocity: number;
  axis: "pending" | "vertical" | "horizontal";
  capture: HTMLElement;
};

/** Pointer work stays outside React renders, including while the audio clock updates. */
export function useSheetGesture({ enabled, open, panelRef, backdropRef, onClose }: SheetOptions) {
  const dragRef = useRef<Drag | null>(null);
  const motionRef = useRef<Animation[]>([]);
  const closeRef = useRef(onClose);
  const activeRef = useRef(false);
  const closingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  const cancelMotion = useCallback(() => {
    motionRef.current.forEach((animation) => animation.cancel());
    motionRef.current = [];
    if (finishTimer.current !== null) clearTimeout(finishTimer.current);
    finishTimer.current = null;
  }, []);

  const moveTo = useCallback((distance: number, opacity: number, duration: number, complete?: () => void) => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel || !backdrop) return;
    const from = getComputedStyle(panel).transform;
    const fromOpacity = getComputedStyle(backdrop).opacity;
    cancelMotion();
    const transform = `translate3d(0, ${distance}px, 0)`;
    panel.style.transform = transform;
    backdrop.style.opacity = String(opacity);
    delete panel.dataset.dragging;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof panel.animate !== "function") {
      complete?.();
      return;
    }
    try {
      const options = { duration, easing: "cubic-bezier(.22, 1, .36, 1)" };
      const motion = panel.animate([{ transform: from }, { transform }], options);
      motionRef.current = [motion, backdrop.animate([{ opacity: fromOpacity }, { opacity }], options)];
      const finish = () => {
        if (motionRef.current[0] !== motion) return;
        if (finishTimer.current !== null) clearTimeout(finishTimer.current);
        finishTimer.current = null;
        motionRef.current = [];
        if (activeRef.current) complete?.();
      };
      void motion.finished.then(finish, () => undefined);
      finishTimer.current = setTimeout(finish, duration + 80);
    } catch {
      cancelMotion();
      complete?.();
    }
  }, [backdropRef, cancelMotion, panelRef]);

  const requestClose = useCallback(() => {
    if (!enabled) { closeRef.current(); return; }
    if (!activeRef.current || closingRef.current) return;
    closingRef.current = true;
    dragRef.current = null;
    const panel = panelRef.current;
    moveTo((panel?.offsetHeight ?? window.innerHeight) + 32, 0, 260, () => closeRef.current());
  }, [enabled, moveTo, panelRef]);

  useEffect(() => {
    if (!enabled || !open) return;
    activeRef.current = true;
    closingRef.current = false;
    suppressClickRef.current = false;
    const frame = requestAnimationFrame(() => moveTo(0, 1, 360));
    return () => {
      activeRef.current = false;
      dragRef.current = null;
      cancelAnimationFrame(frame);
      cancelMotion();
    };
  }, [enabled, open, moveTo, cancelMotion]);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || closingRef.current || dragRef.current) return;
    suppressClickRef.current = false;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const control = target.closest<HTMLElement>("button, a, input, select, textarea, [role='button']");
    if (control && !control.hasAttribute("data-sheet-handle")) return;
    const panel = panelRef.current;
    if (!panel) return;
    const matrix = getComputedStyle(panel).transform;
    const offset = matrix === "none" ? 0 : new DOMMatrixReadOnly(matrix).m42;
    const capture = control ?? event.currentTarget;
    cancelMotion();
    panel.style.transform = `translate3d(0, ${offset}px, 0)`;
    capture.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, originX: event.clientX, originY: event.clientY - offset, lastY: event.clientY, lastTime: event.timeStamp, distance: offset, velocity: 0, axis: "pending", capture };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const panel = panelRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !panel) return;
    const x = event.clientX - drag.originX;
    const y = event.clientY - drag.originY;
    if (drag.axis === "pending") {
      if (Math.abs(x) < 6 && Math.abs(y) < 6) return;
      drag.axis = Math.abs(x) > Math.abs(y) * 1.15 ? "horizontal" : "vertical";
    }
    if (drag.axis === "horizontal") return;
    const elapsed = event.timeStamp - drag.lastTime;
    if (elapsed > 0) drag.velocity = (event.clientY - drag.lastY) / elapsed;
    drag.lastY = event.clientY;
    drag.lastTime = event.timeStamp;
    drag.distance = Math.max(0, Math.min(y, panel.offsetHeight + 32));
    panel.dataset.dragging = "true";
    panel.style.transform = `translate3d(0, ${drag.distance}px, 0)`;
    if (backdropRef.current) backdropRef.current.style.opacity = String(Math.max(.15, 1 - drag.distance / panel.offsetHeight));
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (drag.capture.hasPointerCapture(event.pointerId)) drag.capture.releasePointerCapture(event.pointerId);
    if (cancelled || drag.axis !== "pending") {
      suppressClickRef.current = true;
    }
    const velocity = event.timeStamp - drag.lastTime < 100 ? drag.velocity : 0;
    const threshold = Math.min(150, (panelRef.current?.offsetHeight ?? 600) * .22);
    if (!cancelled && drag.axis === "vertical" && (drag.distance > threshold || (drag.distance > 32 && velocity > .6))) requestClose();
    else moveTo(0, 1, 320);
  }

  function onClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (event.detail === 0) { suppressClickRef.current = false; return; }
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  return {
    requestClose,
    dragHandlers: enabled ? { onPointerDown, onPointerMove, onPointerUp: (event: PointerEvent<HTMLDivElement>) => finishDrag(event), onPointerCancel: (event: PointerEvent<HTMLDivElement>) => finishDrag(event, true), onLostPointerCapture: (event: PointerEvent<HTMLDivElement>) => finishDrag(event, true), onClickCapture } : {},
  };
}
