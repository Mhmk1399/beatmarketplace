"use client";

import { useEffect, useRef } from "react";
import { useAudioAnalyser, useAudioTransport } from "@/components/audio/AudioPlayerProvider";

/** A bounded, live FFT view of the one global audio element. Idle graphics carry no sample data. */
export function TrackSpectrum({ trackId, variant = "orbit" }: { trackId: string; variant?: "orbit" | "bars" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { getAnalyser } = useAudioAnalyser();
  const transport = useAudioTransport();
  const playing = transport.track?.id === trackId && transport.playing;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const lowPower = Boolean(device.connection?.saveData || (device.hardwareConcurrency && device.hardwareConcurrency <= 4) || (device.deviceMemory && device.deviceMemory <= 4));
    let visible = true;
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastFrame = 0;
    let frequencies: Uint8Array<ArrayBuffer> | null = null;
    let colors = { accent: "", bright: "", line: "", signal: "" };

    function draw(live: boolean) {
      if (!context || !canvas || !width || !height) return;
      const analyser = live ? getAnalyser() : null;
      canvas.dataset.analyser = analyser ? "connected" : "idle";
      if (analyser) {
        if (!frequencies || frequencies.length !== analyser.frequencyBinCount) frequencies = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(frequencies);
      }
      context.clearRect(0, 0, width, height);
      const bars = width < 400 || lowPower ? 56 : 88;
      context.lineCap = "round";
      if (variant === "orbit") {
        const cx = width / 2;
        const cy = height / 2;
        const radius = Math.min(width, height) * 0.365;
        context.strokeStyle = colors.line;
        context.lineWidth = 1;
        for (const scale of [0.91, 1.06, 1.27]) {
          context.beginPath(); context.arc(cx, cy, radius * scale, 0, Math.PI * 2); context.stroke();
        }
        const gradient = context.createLinearGradient(cx - radius, cy + radius, cx + radius, cy - radius);
        gradient.addColorStop(0, colors.accent); gradient.addColorStop(0.55, colors.bright); gradient.addColorStop(1, colors.signal);
        context.strokeStyle = gradient;
        context.lineWidth = width < 400 ? 2.3 : 3;
        for (let index = 0; index < bars; index++) {
          const bin = Math.min((frequencies?.length ?? 1) - 1, Math.floor(Math.pow(index / bars, 1.6) * (frequencies?.length ?? 0) * 0.8));
          const energy = analyser && frequencies ? frequencies[bin] / 255 : 0;
          const length = 3 + energy * Math.min(width, height) * 0.105;
          const angle = index / bars * Math.PI * 2 - Math.PI / 2;
          context.globalAlpha = analyser ? 0.45 + energy * 0.55 : 0.32;
          context.beginPath();
          context.moveTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
          context.lineTo(cx + Math.cos(angle) * (radius + length), cy + Math.sin(angle) * (radius + length));
          context.stroke();
        }
      } else {
        const gradient = context.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, colors.accent); gradient.addColorStop(0.65, colors.bright); gradient.addColorStop(1, colors.signal);
        context.strokeStyle = gradient;
        const gap = width / bars;
        context.lineWidth = Math.max(2, gap * 0.4);
        for (let index = 0; index < bars; index++) {
          const bin = Math.min((frequencies?.length ?? 1) - 1, Math.floor(Math.pow(index / bars, 1.5) * (frequencies?.length ?? 0) * 0.8));
          const energy = analyser && frequencies ? frequencies[bin] / 255 : 0;
          const length = 3 + energy * (height - 10);
          context.globalAlpha = analyser ? 0.45 + energy * 0.55 : 0.26;
          context.beginPath(); context.moveTo(gap * (index + 0.5), (height - length) / 2); context.lineTo(gap * (index + 0.5), (height + length) / 2); context.stroke();
        }
      }
      context.globalAlpha = 1;
    }

    function resize() {
      if (!canvas || !context) return;
      const rect = canvas.getBoundingClientRect();
      width = rect.width; height = rect.height;
      const ratio = Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.5);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const style = getComputedStyle(canvas);
      colors = { accent: style.getPropertyValue("--accent").trim(), bright: style.getPropertyValue("--accent-text").trim(), line: style.getPropertyValue("--music-grid").trim() || style.getPropertyValue("--border").trim(), signal: style.getPropertyValue("--music-signal").trim() || style.getPropertyValue("--accent-bright").trim() };
      draw(playing && !media.matches && !document.hidden && visible);
    }

    function animate(now: number) {
      frame = requestAnimationFrame(animate);
      if (now - lastFrame < (lowPower || width < 400 ? 1000 / 24 : 1000 / 30)) return;
      lastFrame = now;
      draw(true);
    }
    function synchronize() {
      cancelAnimationFrame(frame); frame = 0;
      if (playing && visible && !document.hidden && !media.matches) frame = requestAnimationFrame(animate);
      else draw(false);
    }

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(canvas);
    const intersection = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; synchronize(); }, { threshold: 0.01 }) : null;
    intersection?.observe(canvas);
    media.addEventListener("change", synchronize);
    document.addEventListener("visibilitychange", synchronize);
    window.addEventListener("resize", resize, { passive: true });
    resize(); synchronize();
    return () => {
      cancelAnimationFrame(frame); resizeObserver?.disconnect(); intersection?.disconnect();
      media.removeEventListener("change", synchronize);
      document.removeEventListener("visibilitychange", synchronize);
      window.removeEventListener("resize", resize);
    };
  }, [getAnalyser, playing, trackId, variant]);

  return <canvas ref={canvasRef} className={`track-spectrum track-spectrum-${variant}`} data-reactive={playing} aria-hidden="true" />;
}
