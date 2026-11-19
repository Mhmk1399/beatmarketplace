"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ScrollingTitle.module.css";

const REST_MS = 500;

/** Autoplay on every device; transforms never trigger React updates per frame. */
export function ScrollingTitle({ text }: { text: string }) {
  const viewport = useRef<HTMLSpanElement>(null), content = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    const frame = viewport.current!, label = content.current!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let animation: Animation | undefined, duration = 0, distance = 0, rtl = false;
    let visible = true, disposed = false, measurement = 0;
    const update = () => {
      if (disposed || !animation) return;
      if (visible && !document.hidden && !reduced.matches) animation.play();
      else animation.pause();
    };
    const measure = () => {
      if (disposed) return;
      const nextDistance = Math.max(0, label.offsetWidth - frame.clientWidth);
      const nextRtl = getComputedStyle(label).direction === "rtl";
      if (animation && nextDistance === distance && nextRtl === rtl) return;
      const cycle = duration ? Number(animation?.currentTime ?? 0) / duration : 0;
      animation?.cancel(); animation = undefined;
      distance = nextDistance; rtl = nextRtl;
      setOverflow(distance > 2);
      if (distance <= 2) { distance = 0; return; }
      const travel = Math.max(4200, distance / 28 * 1000), ramp = 400;
      duration = travel + 2 * REST_MS;
      const rampProgress = ramp / (2 * (travel - ramp));
      const transform = (progress: number) => `translate3d(${distance * (rtl ? progress - 1 : -progress)}px,0,0)`;
      animation = label.animate([
        { transform: transform(0), offset: 0 },
        { transform: transform(0), offset: REST_MS / duration, easing: "cubic-bezier(.333333,0,.666667,.333333)" },
        { transform: transform(rampProgress), offset: (REST_MS + ramp) / duration },
        { transform: transform(1 - rampProgress), offset: (duration - REST_MS - ramp) / duration, easing: "cubic-bezier(.333333,.666667,.666667,1)" },
        { transform: transform(1), offset: 1 - REST_MS / duration },
        { transform: transform(1), offset: 1 },
      ], { duration, iterations: Infinity, direction: "alternate", fill: "both" });
      animation.pause(); animation.currentTime = cycle * duration; update();
    };
    const schedule = () => { if (disposed) return; cancelAnimationFrame(measurement); measurement = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule); observer.observe(frame); observer.observe(label);
    const intersection = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; update(); });
    intersection.observe(frame);
    document.addEventListener("visibilitychange", update); reduced.addEventListener("change", update);
    void document.fonts.ready.then(schedule); schedule();
    return () => {
      disposed = true; cancelAnimationFrame(measurement);
      observer.disconnect(); intersection.disconnect(); animation?.cancel();
      document.removeEventListener("visibilitychange", update); reduced.removeEventListener("change", update);
    };
  }, [text]);

  return <span className={styles.root} data-overflow={overflow}>
    <span ref={viewport} className={styles.viewport}>
      <span ref={content} className={styles.content} dir="auto">{text}</span>
    </span>
  </span>;
}
