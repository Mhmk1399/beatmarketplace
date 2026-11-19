"use client";

import { useEffect, useRef } from "react";
import { useAudioAnalyser } from "./AudioPlayerProvider";

/** Update compositor properties from the one shared analyser, without React frame updates. */
export function usePlaybackHalo(playing: boolean, enabled = true) {
  const ref = useRef<HTMLSpanElement>(null);
  const { getAnalyser } = useAudioAnalyser();
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motion.matches;
    let visible = false;
    let pageVisible = !document.hidden;
    let frame = 0;
    let disposed = false;
    let last = 0;
    let level = 0;
    let samples: Uint8Array<ArrayBuffer> | null = null;
    const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const lowPower = window.matchMedia("(pointer: coarse)").matches || navigator.hardwareConcurrency <= 4 || (device.deviceMemory ?? 8) <= 4 || device.connection?.saveData;
    const interval = 1000 / (lowPower ? 16 : 24);

    function canRun() { return !disposed && Boolean(node?.isConnected) && playing && enabled && visible && pageVisible && !reduced; }
    function draw(now: number) {
      frame = 0;
      if (!canRun()) return;
      if (now - last >= interval) {
        last = now;
        const analyser = getAnalyser();
        let energy = 0;
        if (analyser) {
          if (!samples || samples.length !== analyser.frequencyBinCount) samples = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(samples);
          const bins = Math.min(96, samples.length);
          for (let index = 1; index < bins; index++) energy += samples[index] / 255;
          energy = Math.min(1, energy / Math.max(1, bins - 1) * 1.8);
        }
        level += (energy - level) * .22;
        node!.style.setProperty("--audio-play-energy", level.toFixed(3));
        node!.dataset.analyser = analyser ? "connected" : "idle";
      }
      frame = requestAnimationFrame(draw);
    }
    function synchronize() {
      if (disposed) return;
      cancelAnimationFrame(frame);
      frame = 0;
      node!.dataset.motion = !playing ? "paused" : !enabled ? "covered" : !pageVisible ? "hidden" : !visible ? "offscreen" : reduced ? "reduced" : "running";
      if (canRun()) { last = 0; frame = requestAnimationFrame(draw); }
      else { level = 0; node!.style.setProperty("--audio-play-energy", "0"); }
    }
    function preference() { reduced = motion.matches; synchronize(); }
    function visibility() { pageVisible = !document.hidden; synchronize(); }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; synchronize(); }, { threshold: .1 });
    observer.observe(node);
    motion.addEventListener("change", preference);
    document.addEventListener("visibilitychange", visibility);
    synchronize();
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); motion.removeEventListener("change", preference); document.removeEventListener("visibilitychange", visibility); };
  }, [playing, enabled, getAnalyser]);
  return ref;
}
