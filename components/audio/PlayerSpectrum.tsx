"use client";

import { useEffect, useRef } from "react";
import { useAudioAnalyser, useAudioTransport } from "@/components/audio/AudioPlayerProvider";

/** Frequency data belongs to the root player's existing audio graph, never a second media element. */
export function PlayerSpectrum({ compact = false }: { compact?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { getAnalyser } = useAudioAnalyser();
  const { track, playing, buffering } = useAudioTransport();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const lowPower = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768 || Boolean(device.connection?.saveData) || (device.deviceMemory ?? 8) <= 4 || navigator.hardwareConcurrency <= 4;
    const frameInterval = 1000 / (lowPower ? 24 : 30);
    let visible = false;
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastFrame = 0;
    let frequencies: Uint8Array<ArrayBuffer> | null = null;
    let levels = new Float32Array(0);
    let peaks = new Float32Array(0);
    let gradient: CanvasGradient | null = null;
    let lineColor = "";
    let peakColor = "";

    function draw(live: boolean) {
      if (!canvas || !context || !width || !height || !gradient) return;
      const analyser = live ? getAnalyser() : null;
      const analyserState = analyser ? "connected" : "idle";
      if (canvas.dataset.analyser !== analyserState) canvas.dataset.analyser = analyserState;
      if (analyser) {
        if (!frequencies || frequencies.length !== analyser.frequencyBinCount) frequencies = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(frequencies);
      }
      context.clearRect(0, 0, width, height);
      const baseline = height * .58;
      context.lineWidth = 1;
      context.strokeStyle = lineColor;
      context.beginPath(); context.moveTo(0, baseline); context.lineTo(width, baseline); context.stroke();
      const spacing = width / levels.length;
      const stroke = Math.max(2, Math.min(compact ? 3 : 4, spacing * .4));
      context.lineCap = "round";
      context.strokeStyle = gradient;
      for (let index = 0; index < levels.length; index++) {
        let energy = 0;
        if (analyser && frequencies) {
          // Log-spaced columns retain the low-frequency detail that drives most beats.
          const start = Math.floor(Math.pow(index / levels.length, 1.8) * frequencies.length * .85);
          const end = Math.min(frequencies.length, Math.max(start + 1, Math.ceil(Math.pow((index + 1) / levels.length, 1.8) * frequencies.length * .85)));
          for (let bin = start; bin < end; bin++) energy += frequencies[bin];
          energy = Math.pow(energy / ((end - start) * 255), .85);
        }
        levels[index] = analyser ? Math.max(energy, levels[index] * .72) : 0;
        peaks[index] = analyser ? Math.max(levels[index], peaks[index] - .028) : 0;
        const amplitude = 1 + levels[index] * height * .43;
        const x = spacing * (index + .5);
        context.lineWidth = stroke;
        context.globalAlpha = analyser ? .55 + levels[index] * .45 : .32;
        context.beginPath(); context.moveTo(x, baseline); context.lineTo(x, baseline - amplitude); context.stroke();
        context.globalAlpha = analyser ? .18 + levels[index] * .12 : .13;
        context.beginPath(); context.moveTo(x, baseline + 3); context.lineTo(x, baseline + 3 + amplitude * .5); context.stroke();
        if (!compact && analyser && peaks[index] > .08) {
          context.fillStyle = peakColor;
          context.globalAlpha = .45;
          context.fillRect(x - stroke * .5, baseline - 5 - peaks[index] * height * .43, stroke, 1);
        }
      }
      context.globalAlpha = 1;
    }

    function canAnimate() { return playing && visible && !document.hidden && !motion.matches; }

    function animate(now: number) {
      frame = 0;
      if (!canAnimate()) return;
      if (now - lastFrame >= frameInterval) { lastFrame = now; draw(true); }
      frame = requestAnimationFrame(animate);
    }

    function synchronize() {
      cancelAnimationFrame(frame); frame = 0;
      if (canAnimate() && getAnalyser()) {
        canvas!.dataset.motion = "running";
        lastFrame = 0;
        frame = requestAnimationFrame(animate);
      } else {
        canvas!.dataset.motion = "static";
        draw(false);
      }
    }

    function resize() {
      if (!canvas || !context) return;
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width; height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.5);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const bands = Math.max(24, Math.min(lowPower ? 48 : 96, Math.floor(width / (compact ? 6 : 8))));
      if (levels.length !== bands) { levels = new Float32Array(bands); peaks = new Float32Array(bands); }
      canvas.dataset.bands = String(bands);
      const theme = getComputedStyle(canvas);
      lineColor = theme.getPropertyValue("--music-border").trim();
      peakColor = theme.getPropertyValue("--accent-text").trim();
      gradient = context.createLinearGradient(0, height, width, 0);
      gradient.addColorStop(0, theme.getPropertyValue("--accent").trim());
      gradient.addColorStop(.5, theme.getPropertyValue("--accent-bright").trim());
      gradient.addColorStop(1, theme.getPropertyValue("--music-signal").trim());
      draw(canAnimate());
    }

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(canvas);
    const intersection = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; synchronize(); }, { threshold: .01 }) : null;
    if (intersection) intersection.observe(canvas);
    else visible = true;
    document.addEventListener("visibilitychange", synchronize);
    motion.addEventListener("change", synchronize);
    window.addEventListener("resize", resize, { passive: true });
    resize(); synchronize();
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect(); intersection?.disconnect();
      document.removeEventListener("visibilitychange", synchronize);
      motion.removeEventListener("change", synchronize);
      window.removeEventListener("resize", resize);
    };
  }, [compact, getAnalyser, playing, track?.id]);

  const state = buffering ? "Connecting" : playing ? "Live audio" : "Paused";
  return <figure className={`audio-spectrum ${compact ? "audio-spectrum-compact" : "audio-spectrum-full"}`} data-playing={playing} aria-label={`Frequency spectrum${track ? ` for ${track.title}` : ""}`}>
    <figcaption className="audio-spectrum-caption"><span>{compact ? "Spectrum" : "Sound in motion"}</span><span className="audio-spectrum-state"><i aria-hidden="true" />{state}</span></figcaption>
    <div className="audio-spectrum-stage"><canvas ref={canvasRef} className="audio-spectrum-canvas" aria-hidden="true" /></div>
    {!compact && <div className="audio-spectrum-registers" aria-hidden="true"><span>LOW</span><span>MID</span><span>HIGH</span></div>}
  </figure>;
}
