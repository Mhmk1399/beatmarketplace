"use client";

import { useEffect, useId, useRef, type CSSProperties } from "react";

import { useAudioAnalyser, useAudioTransport } from "@/components/audio/AudioPlayerProvider";
import { cn } from "@/lib/cn";
import type { AudioAnalyser, AudioPlayerContextValue } from "@/lib/audio/types";
import { clamp, formatAudioTime } from "@/lib/audio/utils";
import demoPlayerWaveforms from "@/lib/audio/demo-player-waveforms.json";

type TimelineProps = {
  player: AudioPlayerContextValue;
  large?: boolean;
  /** The dock keeps its seek layout while its covered canvas is unmounted. */
  visualize?: boolean;
};

type SpectrumSnapshot = { trackId: string; levels: Float32Array };
// One bounded frame per mounted player's analyser, retained when its canvas moves
// between dock and sheet. Effects are the only writers; server renders stay empty.
const frozenFrames = new WeakMap<AudioAnalyser["getAnalyser"], SpectrumSnapshot>();
// Cached samples from the local demo files: no extra media element or MP3 download.
const demoEnvelopes: Record<string, number[]> = demoPlayerWaveforms;

/** A live frequency spectrum attached to the seek rail, rather than invented song samples. */
function TimelineWaveform({ progress, large }: { progress: number; large: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(progress);
  const redrawRef = useRef<(() => void) | null>(null);
  const { getAnalyser } = useAudioAnalyser();
  const { track, playing } = useAudioTransport();
  const trackId = track?.id ?? "";

  // Timeline updates recolor the existing columns without rebuilding the canvas or FFT loop.
  useEffect(() => {
    progressRef.current = progress;
    redrawRef.current?.();
  }, [playing, progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motion.matches;
    const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const lowPower = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768 || Boolean(device.connection?.saveData) || (device.deviceMemory ?? 8) <= 4 || navigator.hardwareConcurrency <= 4;
    if (frozenFrames.get(getAnalyser)?.trackId !== trackId) frozenFrames.delete(getAnalyser);
    const interval = 1000 / (lowPower ? 24 : 30);
    const envelope = demoEnvelopes[trackId];
    const profileAt = (index: number, count: number) => {
      if (!envelope?.length) return 0;
      const position = index / Math.max(1, count - 1) * (envelope.length - 1);
      const lower = Math.floor(position);
      const value = envelope[lower] * (1 - (position - lower)) + envelope[Math.min(envelope.length - 1, lower + 1)] * (position - lower);
      return Math.pow(value, 1.5);
    };
    let visible = false;
    let width = 0;
    let height = 0;
    let baseline = 0;
    let frame = 0;
    let lastFrame = 0;
    let frequencies: Uint8Array<ArrayBuffer> | null = null;
    let levels = new Float32Array(0);
    let playedGradient: CanvasGradient | null = null;
    let unplayedColor = "";

    function draw(sample: boolean) {
      if (!canvas || !context || !canvas.isConnected || !width || !height || !levels.length || !playedGradient) return;
      const analyser = sample ? getAnalyser() : null;
      const analyserState = analyser ? "connected" : "idle";
      if (canvas.dataset.analyser !== analyserState) canvas.dataset.analyser = analyserState;
      if (analyser) {
        if (!frequencies || frequencies.length !== analyser.frequencyBinCount) frequencies = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(frequencies);
        // Interpolated log-spaced FFT bins preserve real musical energy without stepped repeats.
        for (let index = 0; index < levels.length; index++) {
          const bin = Math.pow((index + .5) / levels.length, 1.45) * (frequencies.length - 1) * .86;
          const lower = Math.floor(bin);
          const upper = Math.min(frequencies.length - 1, lower + 1);
          const fraction = bin - lower;
          const frequencyEnergy = Math.pow((frequencies[lower] * (1 - fraction) + frequencies[upper] * fraction) / 255, .85);
          const energy = envelope ? profileAt(index, levels.length) * (.68 + frequencyEnergy * .32) : frequencyEnergy;
          levels[index] = energy > levels[index] ? levels[index] + (energy - levels[index]) * .72 : Math.max(energy, levels[index] * .76);
        }
        const snapshot = frozenFrames.get(getAnalyser);
        if (snapshot?.trackId === trackId) snapshot.levels = levels;
        else frozenFrames.set(getAnalyser, { trackId, levels });
      }

      context.clearRect(0, 0, width, height);
      context.beginPath();
      const spacing = width / levels.length;
      const available = Math.max(2, Math.min(baseline, height - baseline) - 3);
      for (let index = 0; index < levels.length; index++) {
        const x = spacing * (index + .5);
        const amplitude = .75 + levels[index] * available;
        context.moveTo(x, baseline - amplitude);
        context.lineTo(x, baseline + amplitude);
      }
      context.lineWidth = Math.max(1.1, Math.min(large ? 2 : 1.6, spacing * .48));
      context.lineCap = "round";
      context.globalAlpha = playing ? .62 : .46;
      context.strokeStyle = unplayedColor;
      context.stroke();

      const playedWidth = clamp(progressRef.current, 0, 100) / 100 * width;
      if (playedWidth > 0) {
        context.save();
        context.beginPath();
        context.rect(0, 0, playedWidth, height);
        context.clip();
        context.beginPath();
        for (let index = 0; index < levels.length; index++) {
          const x = spacing * (index + .5);
          const amplitude = .75 + levels[index] * available;
          context.moveTo(x, baseline - amplitude);
          context.lineTo(x, baseline + amplitude);
        }
        context.globalAlpha = playing ? 1 : .8;
        context.strokeStyle = playedGradient;
        context.stroke();
        context.restore();
      }
      context.globalAlpha = 1;
    }

    function canAnimate() { return Boolean(canvas?.isConnected) && playing && visible && !document.hidden && !reducedMotion; }
    function preference() { reducedMotion = motion.matches; synchronize(); }
    function animate(now: number) {
      frame = 0;
      if (!canAnimate()) return;
      if (now - lastFrame >= interval) { lastFrame = now; draw(true); }
      frame = requestAnimationFrame(animate);
    }
    function synchronize() {
      cancelAnimationFrame(frame);
      frame = 0;
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
      if (!canvas || !context || !canvas.isConnected) return;
      const bounds = canvas.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const bands = Math.max(32, Math.min(lowPower ? 112 : 220, Math.floor(width / (large ? 4 : 2.8))));
      const snapshot = frozenFrames.get(getAnalyser);
      const saved = snapshot?.trackId === trackId ? snapshot.levels : null;
      levels = new Float32Array(bands);
      if (saved?.length) {
        for (let index = 0; index < bands; index++) levels[index] = saved[Math.min(saved.length - 1, Math.floor(index / bands * saved.length))];
      } else if (envelope) for (let index = 0; index < bands; index++) levels[index] = profileAt(index, bands);
      canvas.dataset.bands = String(bands);
      const theme = getComputedStyle(canvas);
      const line = Number.parseFloat(theme.getPropertyValue("--audio-rail-position"));
      baseline = height * (Number.isFinite(line) ? clamp(line, 30, 85) / 100 : .5);
      const color = (name: string, fallback: string) => theme.getPropertyValue(name).trim() || theme.getPropertyValue(fallback).trim();
      const low = color("--player-waveform-low", "--accent");
      const middle = color("--player-waveform-played", "--accent-text");
      const high = color("--player-waveform-high", "--accent-text");
      if (!low || !middle || !high) return;
      unplayedColor = color("--player-waveform-unplayed", "--accent-text");
      playedGradient = context.createLinearGradient(0, baseline, width, 0);
      playedGradient.addColorStop(0, low);
      playedGradient.addColorStop(.55, middle);
      playedGradient.addColorStop(1, high);
      draw(canAnimate());
    }

    redrawRef.current = () => { if (!canAnimate()) draw(false); };
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(canvas);
    const intersection = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; synchronize(); }, { threshold: .01 }) : null;
    if (intersection) intersection.observe(canvas);
    else visible = true;
    document.addEventListener("visibilitychange", synchronize);
    motion.addEventListener("change", preference);
    window.addEventListener("resize", resize, { passive: true });
    resize();
    synchronize();
    return () => {
      cancelAnimationFrame(frame);
      redrawRef.current = null;
      resizeObserver?.disconnect();
      intersection?.disconnect();
      document.removeEventListener("visibilitychange", synchronize);
      motion.removeEventListener("change", preference);
      window.removeEventListener("resize", resize);
    };
  }, [getAnalyser, large, playing, trackId]);

  return <canvas ref={canvasRef} className="audio-waveform-canvas" aria-hidden="true" />;
}

export function PlayerTimeline({ player, large = false, visualize = true }: TimelineProps) {
  const id = useId();
  const duration = Number.isFinite(player.duration) ? Math.max(0, player.duration) : 0;
  const elapsed = clamp(player.elapsed, 0, duration);
  const progress = duration ? elapsed / duration * 100 : 0;
  const buffered = duration ? clamp(player.buffered, 0, duration) / duration * 100 : 0;
  const style = { "--audio-progress": `${progress}%`, "--audio-buffered": `${buffered}%` } as CSSProperties;

  return <div className={cn("audio-timeline", large && "audio-timeline-large")}>
    <label htmlFor={id} className="sr-only">Playback position</label>
    <span className="audio-time audio-time-elapsed" aria-hidden="true">{formatAudioTime(elapsed)}</span>
    <div className="audio-seek" style={style}>
      {visualize && <TimelineWaveform progress={progress} large={large} />}
      <div className="audio-seek-rail" aria-hidden="true"><span className="audio-seek-buffered" /><span className="audio-seek-progress" /></div>
      <input id={id} type="range" min={0} max={duration || 1} step={.1} value={elapsed} disabled={!duration} onChange={(event) => player.seek(Number(event.target.value))} aria-valuetext={`${formatAudioTime(elapsed)} of ${formatAudioTime(duration)}`} />
    </div>
    <span className="audio-time audio-time-duration" aria-hidden="true">{duration ? formatAudioTime(duration) : "–:––"}</span>
  </div>;
}
