"use client";

import { useEffect, useRef, useState } from "react";
import { useAudioPlayer } from "@/components/audio/AudioPlayerProvider";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { apiRequest } from "@/components/studio/shared";
import { ListeningMeasurement, type ListeningResult } from "@/lib/audio/diagnostics";
import { demoTracks } from "@/lib/audio/demo-tracks";
import { marketplaceAudioTrack } from "@/lib/audio/marketplace-track";
import type { AudioTrack } from "@/lib/audio/types";
import type { MarketplaceTrack } from "@/lib/marketplace/types";

type DeviceResult = ListeningResult & {
  checkedAt: string; kind: "preview" | "demo"; quality: string; browser: string;
  network: string; online: boolean; note: string;
};

/** Observe the real shared player on this device; do not create a second audio element. */
export function AudioDiagnostics() {
  const player = useAudioPlayer();
  const [preview, setPreview] = useState<AudioTrack | null>(null);
  const [catalogState, setCatalogState] = useState("Finding a published preview…");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DeviceResult | null>(null);
  const [message, setMessage] = useState("");
  const cleanupRef = useRef<() => void>(() => {});
  const cancelRef = useRef<() => void>(() => {});

  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<{ tracks: MarketplaceTrack[] }>("/api/tracks?pageSize=8&pagination=cursor&sort=newest", { signal: controller.signal, quiet: true })
      .then(data => {
        if (controller.signal.aborted) return;
        const track = data.tracks.find(track => Boolean(track.previewUrl));
        setPreview(track ? marketplaceAudioTrack(track) : null);
        setCatalogState(track ? "A published preview is ready." : "No playable preview is available. You can still test the demo.");
      }).catch(() => { if (!controller.signal.aborted) setCatalogState("The catalog is unavailable. You can still test the demo."); });
    return () => { controller.abort(); cleanupRef.current(); };
  }, []);

  function start(kind: "preview" | "demo") {
    const track = kind === "preview" ? preview : { ...demoTracks[0], durationLimitSeconds: 30 };
    const element = document.querySelector<HTMLAudioElement>("audio[data-global-audio]");
    if (!track || !element) { setMessage("The shared player is not ready. Please try again."); return; }
    const audio = element;
    cleanupRef.current(); player.pause(); player.seek(0);
    const quality = player.quality;
    const source = quality === "data-saver" && track.lowDataSrc ? track.lowDataSrc : track.src;
    const expected = new URL(source, location.origin);
    const measurement = new ListeningMeasurement(performance.now());
    const checkedAt = new Date().toISOString();
    const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
    let firstPlaying = false, finished = false;
    let maximumPosition = 0;
    let observation: ReturnType<typeof setTimeout> | undefined;
    const matchesSource = () => {
      const actual = new URL(audio.currentSrc || audio.src || location.href);
      return actual.pathname.split("/").pop() === expected.pathname.split("/").pop() && actual.searchParams.get("quality") === expected.searchParams.get("quality");
    };
    const cleanup = () => {
      clearTimeout(startup); clearTimeout(observation);
      audio.removeEventListener("playing", playing); audio.removeEventListener("waiting", waiting);
      audio.removeEventListener("error", failed); audio.removeEventListener("pause", paused);
      audio.removeEventListener("ended", ended); audio.removeEventListener("loadstart", sourceChanged);
      audio.removeEventListener("timeupdate", progress);
    };
    const finish = (outcome: ListeningResult["outcome"], note: string) => {
      if (finished) return;
      finished = true; cleanup();
      setResult({ ...measurement.finish(performance.now(), outcome, Math.max(maximumPosition, audio.currentTime)), checkedAt, kind, quality,
        browser: navigator.userAgent, network: connection?.effectiveType || "Not reported by browser",
        online: navigator.onLine, note });
      setMessage(note); setRunning(false);
      if (outcome !== "cancelled") setTimeout(() => { if (matchesSource()) player.pause(); }, 0);
    };
    function playing() {
      if (!matchesSource()) return;
      measurement.playing(performance.now());
      if (firstPlaying) return;
      firstPlaying = true; clearTimeout(startup);
      observation = setTimeout(() => { finish("complete", "The 30-second observation is complete."); player.pause(); }, 30_000);
    }
    function waiting() { if (matchesSource()) measurement.waiting(performance.now()); }
    function progress() { if (matchesSource()) maximumPosition = Math.max(maximumPosition, audio.currentTime); }
    function failed() { if (matchesSource()) finish("failed", "Audio could not be played. Check the connection and retry."); }
    const paused = () => {
      if (firstPlaying && audio.paused) finish(audio.currentTime >= 29.9 ? "complete" : "cancelled", audio.currentTime >= 29.9 ? "The audio sample finished." : "Playback was paused before the check finished.");
    }
    function ended() { finish("complete", "The audio sample finished."); }
    function sourceChanged() { if (firstPlaying && !matchesSource()) finish("cancelled", "The audio source changed. Start a new check for a comparable result."); }
    audio.addEventListener("playing", playing); audio.addEventListener("waiting", waiting);
    audio.addEventListener("error", failed); audio.addEventListener("pause", paused);
    audio.addEventListener("ended", ended); audio.addEventListener("loadstart", sourceChanged);
    audio.addEventListener("timeupdate", progress);
    const startup = setTimeout(() => { finish("failed", "Playback did not start within 25 seconds."); player.pause(); }, 25_000);
    cleanupRef.current = cleanup;
    cancelRef.current = () => { finish("cancelled", "The check was stopped."); player.pause(); };
    setResult(null); setRunning(true); setMessage("Measuring playback on this device…");
    player.play(track, [track]);
  }

  function download() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "listening-check.json"; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <section className="neo-raised space-y-4 rounded-[var(--radius-card)] p-6" aria-labelledby="device-audio-check-title">
    <h2 id="device-audio-check-title" className="font-extrabold">Listening check on this device</h2>
    <p className="text-sm leading-7 text-muted">Open this page on a phone to measure how quickly audio starts and how often it pauses to load. The check uses the shared player for up to 30 seconds. Results stay on this device.</p>
    <p className="text-xs text-muted">{catalogState} Repeat listens may use cached audio.</p>
    <div className="flex flex-wrap gap-3">
      <NeumorphicButton variant="accent" disabled={running || !preview} onClick={() => start("preview")}>Test preview</NeumorphicButton>
      <NeumorphicButton disabled={running} onClick={() => start("demo")}>Test demo</NeumorphicButton>
      <NeumorphicButton disabled={running} aria-pressed={player.quality === "data-saver"} onClick={() => player.setQuality(player.quality === "standard" ? "data-saver" : "standard")}>Data saver {player.quality === "data-saver" ? "on" : "off"}</NeumorphicButton>
      {running && <NeumorphicButton onClick={() => cancelRef.current()}>Stop check</NeumorphicButton>}
    </div>
    {message && <p role="status" aria-live="polite" className="text-sm text-muted">{message}</p>}
    {result && <div className="neo-inset space-y-3 rounded-[var(--radius-control)] p-4">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-muted">Audio started</dt><dd>{result.startMs === null ? "Did not start" : `${(result.startMs / 1000).toFixed(2)} seconds`}</dd></div>
        <div><dt className="text-muted">Buffering pauses</dt><dd>{result.stalls}</dd></div>
        <div><dt className="text-muted">Time buffering</dt><dd>{(result.bufferingMs / 1000).toFixed(2)} seconds</dd></div>
        <div><dt className="text-muted">Playback reached</dt><dd>{result.positionSeconds.toFixed(1)} seconds</dd></div>
      </dl>
      <NeumorphicButton size="sm" onClick={download}>Download results</NeumorphicButton>
      <p className="text-xs text-muted">The report includes browser and network information. It contains no account details, file addresses, or credentials, and is not uploaded automatically.</p>
    </div>}
  </section>;
}
