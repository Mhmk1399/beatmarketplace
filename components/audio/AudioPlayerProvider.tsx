"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { AudioAnalyser, AudioPlayerActions, AudioPlayerContextValue, AudioPlayerState, AudioTrack, AudioTransport } from "@/lib/audio/types";
import { adjacentIndex, buildQueue, clamp, mediaErrorMessage, trackDuration, uniqueQueue } from "@/lib/audio/utils";

const PlayerContext = createContext<AudioPlayerContextValue | null>(null);
const ActionsContext = createContext<AudioPlayerActions | null>(null);
const TransportContext = createContext<AudioTransport | null>(null);
const AnalyserContext = createContext<AudioAnalyser | null>(null);
const SETTINGS_KEY = "beatmarketplace-audio-settings-v1";
const initialState: AudioPlayerState = {
  track: null, queue: [], queueIndex: -1, playing: false, buffering: false,
  elapsed: 0, duration: 0, buffered: 0, volume: 0.8, muted: false, repeat: "off", shuffle: false, error: null,
  quality: "standard", slowConnection: false, offline: false,
};
type AudioGraph = { audio: HTMLAudioElement; context: AudioContext; source: MediaElementAudioSourceNode; analyser: AnalyserNode | null };
type LoadOptions = { autoPlay?: boolean; resetHistory?: boolean; recordHistory?: boolean };

function bufferedSeconds(audio: HTMLAudioElement, duration: number) {
  try { return audio.buffered.length ? clamp(audio.buffered.end(audio.buffered.length - 1), 0, duration) : 0; }
  catch { return 0; }
}

/** Mounted once in the root layout. Route changes never replace its media element. */
export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const graphRef = useRef<AudioGraph | null>(null);
  const graphAttemptedRef = useRef<HTMLAudioElement | null>(null);
  const graphCleanupRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequenceRef = useRef(0);
  const intendedPlayRef = useRef(false);
  const completedSequenceRef = useRef(-1);
  const pendingSeekRef = useRef<number | null>(null);
  const lastProgressRef = useRef(0);
  const historyRef = useRef<string[]>([]);
  const historyPositionRef = useRef(-1);
  const visitedRef = useRef(new Set<string>());
  const settingsReadyRef = useRef(false);
  const stateRef = useRef<AudioPlayerState>(initialState);
  const [state, setState] = useState<AudioPlayerState>(initialState);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const update = useCallback((patch: Partial<AudioPlayerState>) => {
    if (!Object.entries(patch).some(([key, value]) => !Object.is(stateRef.current[key as keyof AudioPlayerState], value))) return;
    const next = { ...stateRef.current, ...patch };
    stateRef.current = next;
    setState(next);
  }, []);

  // Web Audio is optional; the native media element remains the playback owner.
  // Construct this graph only inside a play gesture, never during initial page load.
  const resumeAnalysis = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (graphRef.current && graphRef.current.audio !== audio) {
      const previous = graphRef.current;
      previous.source.disconnect(); previous.analyser?.disconnect();
      void previous.context.close().catch(() => undefined);
      graphRef.current = null;
    }
    if (!graphRef.current && graphAttemptedRef.current !== audio) {
      graphAttemptedRef.current = audio;
      const Constructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Constructor) return;
      let context: AudioContext | null = null;
      let source: MediaElementAudioSourceNode | null = null;
      try {
        context = new Constructor();
        source = context.createMediaElementSource(audio);
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.82;
        source.connect(analyser);
        analyser.connect(context.destination);
        graphRef.current = { audio, context, source, analyser };
      } catch {
        // If a source was already created, keep a direct output path so failed
        // visualization setup can never leave a working song silently disconnected.
        if (context && source) {
          source.disconnect();
          source.connect(context.destination);
          graphRef.current = { audio, context, source, analyser: null };
        } else if (context) void context.close().catch(() => undefined);
      }
    }
    const context = graphRef.current?.context;
    if (context && context.state !== "running" && context.state !== "closed") void context.resume().catch(() => undefined);
  }, []);

  const pause = useCallback(() => {
    ++sequenceRef.current;
    intendedPlayRef.current = false;
    audioRef.current?.pause();
    update({ playing: false, buffering: false, slowConnection: false });
  }, [update]);

  const loadTrack = useCallback((track: AudioTrack, queue: AudioTrack[], options: LoadOptions = {}) => {
    const audio = audioRef.current;
    if (!audio || !track.src) return;
    const autoPlay = options.autoPlay !== false;
    const previous = stateRef.current;
    const source = previous.quality === "data-saver" && track.lowDataSrc ? track.lowDataSrc : track.src;
    const changed = previous.track?.id !== track.id || audio.getAttribute("src") !== source;
    const sequence = ++sequenceRef.current;
    setLoadAttempt(sequence);
    completedSequenceRef.current = -1;
    intendedPlayRef.current = autoPlay;
    if (changed) audio.pause();
    if (options.resetHistory) {
      historyRef.current = [track.id]; historyPositionRef.current = 0; visitedRef.current = new Set([track.id]);
    } else if (options.recordHistory !== false && (changed || !historyRef.current.length)) {
      historyRef.current = [...historyRef.current.slice(0, historyPositionRef.current + 1), track.id].slice(-400);
      historyPositionRef.current = historyRef.current.length - 1;
      visitedRef.current.add(track.id);
    }
    update({ track, queue, queueIndex: queue.findIndex((item) => item.id === track.id),
      elapsed: changed ? 0 : clamp(audio.currentTime, 0, previous.duration),
      duration: changed ? trackDuration(track, 0) : previous.duration,
      buffered: changed ? 0 : previous.buffered, playing: false, buffering: autoPlay, slowConnection: false, error: null });
    if (changed) {
      pendingSeekRef.current = null;
      audio.src = source;
      audio.load();
    } else if (audio.ended || (previous.duration > 0 && audio.currentTime >= previous.duration - 0.05)) {
      audio.currentTime = 0;
      update({ elapsed: 0 });
    }
    if (!autoPlay) return;
    resumeAnalysis();
    // Call play synchronously in the gesture, including on iOS; awaiting the
    // AudioContext's resume first can lose transient user activation.
    void audio.play().then(() => {
      if (sequence === sequenceRef.current && intendedPlayRef.current) update({ playing: !audio.paused, buffering: false });
    }).catch((error: unknown) => {
      if (sequence !== sequenceRef.current) return;
      intendedPlayRef.current = false;
      if (error instanceof DOMException && error.name === "AbortError") { update({ playing: false, buffering: false }); return; }
      update({ playing: false, buffering: false, error: error instanceof DOMException && error.name === "NotAllowedError" ? "Tap play to allow audio in this browser." : mediaErrorMessage(audio.error?.code) });
    });
  }, [resumeAnalysis, update]);

  const play = useCallback((track: AudioTrack, suppliedQueue?: AudioTrack[]) => {
    const previous = stateRef.current;
    const queue = buildQueue(track, suppliedQueue, previous.queue);
    const changedQueue = previous.queue.length !== queue.length || previous.queue.some((item, index) => item.id !== queue[index]?.id || item.src !== queue[index]?.src);
    loadTrack(track, queue, { resetHistory: previous.track?.id !== track.id || changedQueue });
  }, [loadTrack]);

  const toggle = useCallback((requested?: AudioTrack, suppliedQueue?: AudioTrack[]) => {
    const current = stateRef.current;
    const track = requested ?? current.track;
    if (!track) return;
    if (current.track?.id === track.id && current.track.src === track.src && (!audioRef.current?.paused || (current.buffering && intendedPlayRef.current))) pause();
    else play(track, suppliedQueue);
  }, [pause, play]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    const current = stateRef.current;
    if (!audio || !current.track || current.duration <= 0) return;
    const value = clamp(seconds, 0, current.duration);
    completedSequenceRef.current = -1;
    if (audio.readyState === 0) pendingSeekRef.current = value;
    else { try { audio.currentTime = value; } catch { pendingSeekRef.current = value; } }
    update({ elapsed: value });
  }, [update]);
  const skip = useCallback((seconds: number) => seek((audioRef.current?.currentTime ?? stateRef.current.elapsed) + seconds), [seek]);

  const advance = useCallback((direction: -1 | 1, automatic = false) => {
    const current = stateRef.current;
    if (!current.track || !current.queue.length) return false;
    if (direction === -1 && (audioRef.current?.currentTime ?? 0) > 3) { seek(0); return true; }
    let nextIndex = -1;
    let useHistory = false;
    if (current.shuffle) {
      const position = historyPositionRef.current + direction;
      if (position >= 0 && position < historyRef.current.length) {
        nextIndex = current.queue.findIndex((item) => item.id === historyRef.current[position]);
        if (nextIndex >= 0) { historyPositionRef.current = position; useHistory = true; }
      }
      if (nextIndex < 0 && direction === 1) {
        let choices = current.queue.map((item, index) => ({ item, index })).filter(({ item }) => item.id !== current.track?.id && !visitedRef.current.has(item.id));
        if (!choices.length && (current.repeat === "all" || !automatic)) {
          visitedRef.current = new Set([current.track.id]);
          choices = current.queue.map((item, index) => ({ item, index })).filter(({ item }) => item.id !== current.track?.id);
        }
        if (choices.length) nextIndex = choices[Math.floor(Math.random() * choices.length)].index;
      }
    } else nextIndex = adjacentIndex(current.queue.length, current.queueIndex, direction, current.repeat, false);
    if (nextIndex < 0) { if (direction === -1) seek(0); return false; }
    loadTrack(current.queue[nextIndex], current.queue, { recordHistory: !useHistory });
    return true;
  }, [loadTrack, seek]);
  const previous = useCallback(() => { advance(-1); }, [advance]);
  const next = useCallback(() => { advance(1); }, [advance]);

  const finishTrack = useCallback(() => {
    if (completedSequenceRef.current === sequenceRef.current) return;
    completedSequenceRef.current = sequenceRef.current;
    const current = stateRef.current;
    if (!current.track) return;
    audioRef.current?.pause();
    update({ elapsed: current.duration, playing: false, buffering: false });
    if (current.repeat === "one" || (current.repeat === "all" && current.queue.length === 1)) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      loadTrack(current.track, current.queue, { recordHistory: false });
      return;
    }
    if (!advance(1, true)) intendedPlayRef.current = false;
  }, [advance, loadTrack, update]);

  const persistSettings = useCallback((volume: number, muted: boolean) => {
    if (!settingsReadyRef.current) return;
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ volume, muted })); } catch { /* Playback works when browser storage is disabled. */ }
  }, []);
  const setVolume = useCallback((value: number) => {
    const audio = audioRef.current;
    const volume = clamp(value, 0, 1);
    if (audio) { audio.volume = volume; if (volume > 0) audio.muted = false; }
    const muted = audio?.muted ?? stateRef.current.muted;
    update({ volume, muted }); persistSettings(volume, muted);
  }, [persistSettings, update]);
  const toggleMuted = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.muted || stateRef.current.volume === 0) {
      audio.muted = false;
      if (stateRef.current.volume === 0) audio.volume = 0.8;
    } else audio.muted = true;
    update({ volume: audio.volume, muted: audio.muted }); persistSettings(audio.volume, audio.muted);
  }, [persistSettings, update]);
  const cycleRepeat = useCallback(() => {
    const value = stateRef.current.repeat;
    update({ repeat: value === "off" ? "all" : value === "all" ? "one" : "off" });
  }, [update]);
  const toggleShuffle = useCallback(() => {
    const current = stateRef.current;
    historyRef.current = current.track ? [current.track.id] : [];
    historyPositionRef.current = current.track ? 0 : -1;
    visitedRef.current = new Set(current.track ? [current.track.id] : []);
    update({ shuffle: !current.shuffle });
  }, [update]);
  const clear = useCallback(() => {
    pause();
    const audio = audioRef.current;
    if (audio) { audio.removeAttribute("src"); audio.load(); }
    historyRef.current = []; historyPositionRef.current = -1; visitedRef.current.clear(); pendingSeekRef.current = null;
    update({ track: null, queue: [], queueIndex: -1, elapsed: 0, duration: 0, buffered: 0, error: null });
  }, [pause, update]);
  const enqueue = useCallback((track: AudioTrack) => {
    const current = stateRef.current;
    update({ queue: uniqueQueue([...current.queue, track]) });
  }, [update]);
  const removeFromQueue = useCallback((id: string) => {
    const current = stateRef.current;
    const queue = current.queue.filter((item) => item.id !== id);
    if (current.track?.id !== id) { update({ queue, queueIndex: queue.findIndex((item) => item.id === current.track?.id) }); return; }
    if (!queue.length) { clear(); return; }
    loadTrack(queue[Math.min(current.queueIndex, queue.length - 1)], queue, { autoPlay: current.playing || intendedPlayRef.current, resetHistory: true });
  }, [clear, loadTrack, update]);
  const retry = useCallback(() => {
    const current = stateRef.current;
    const audio = audioRef.current;
    if (!current.track || !audio) return;
    const elapsed = current.elapsed;
    audio.load();
    loadTrack(current.track, current.queue, { recordHistory: false });
    pendingSeekRef.current = elapsed;
  }, [loadTrack]);

  const setQuality = useCallback((quality: "standard" | "data-saver") => {
    const current = stateRef.current;
    if (current.quality === quality) return;
    const elapsed = audioRef.current?.currentTime ?? current.elapsed;
    const autoPlay = !current.offline && (current.playing || intendedPlayRef.current || Boolean(current.error));
    update({ quality });
    try { localStorage.setItem("beatmarketplace-audio-quality-v1", quality); } catch { /* Optional preference. */ }
    if (current.track) {
      loadTrack(current.track, current.queue, { recordHistory: false, autoPlay });
      pendingSeekRef.current = elapsed;
    }
  }, [loadTrack, update]);

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    let quality: "standard" | "data-saver" = connection?.saveData ? "data-saver" : "standard";
    try {
      const saved = localStorage.getItem("beatmarketplace-audio-quality-v1");
      if (saved === "standard" || saved === "data-saver") quality = saved;
    } catch { /* Browser storage is optional. */ }
    let active = true;
    Promise.resolve().then(() => { if (active) update({ quality, offline: !navigator.onLine }); });
    const online = () => update({ offline: !navigator.onLine });
    window.addEventListener("online", online); window.addEventListener("offline", online);
    return () => { active = false; window.removeEventListener("online", online); window.removeEventListener("offline", online); };
  }, [update]);

  useEffect(() => {
    if (!state.buffering) return;
    const sequence = sequenceRef.current;
    const slow = setTimeout(() => { if (sequenceRef.current === sequence && intendedPlayRef.current) update({ slowConnection: true }); }, 8000);
    const timeout = setTimeout(() => {
      if (sequenceRef.current !== sequence || !intendedPlayRef.current) return;
      pause();
      update({ error: "Audio is taking too long to load. Check your connection, try lower-data audio, or retry." });
    }, 25_000);
    return () => { clearTimeout(slow); clearTimeout(timeout); };
  }, [state.buffering, state.track, state.quality, loadAttempt, pause, update]);

  const syncProgress = useCallback((force = false) => {
    const audio = audioRef.current;
    const current = stateRef.current;
    if (!audio || !current.track) return;
    const duration = trackDuration(current.track, audio.duration);
    if (intendedPlayRef.current && duration > 0 && audio.currentTime >= duration - 0.015) { finishTrack(); return; }
    const now = performance.now();
    if (!force && now - lastProgressRef.current < 180) return;
    lastProgressRef.current = now;
    update({ elapsed: clamp(audio.currentTime, 0, duration), duration, buffered: bufferedSeconds(audio, duration) });
    if ("mediaSession" in navigator && navigator.mediaSession.setPositionState && duration > 0) {
      try { navigator.mediaSession.setPositionState({ duration, playbackRate: audio.playbackRate, position: clamp(audio.currentTime, 0, duration) }); } catch { /* Some browsers support metadata but not position reporting. */ }
    }
  }, [finishTrack, update]);

  const loadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !stateRef.current.track) return;
    const duration = trackDuration(stateRef.current.track, audio.duration);
    update({ duration, buffered: bufferedSeconds(audio, duration) });
    if (pendingSeekRef.current !== null) {
      const value = pendingSeekRef.current; pendingSeekRef.current = null; seek(value);
    }
    syncProgress(true);
  }, [seek, syncProgress, update]);

  const actions = useMemo<AudioPlayerActions>(() => ({ play, toggle, pause, seek, skip, previous, next, setVolume, toggleMuted, cycleRepeat, toggleShuffle, clear, enqueue, removeFromQueue, retry, setQuality }),
    [play, toggle, pause, seek, skip, previous, next, setVolume, toggleMuted, cycleRepeat, toggleShuffle, clear, enqueue, removeFromQueue, retry, setQuality]);
  const transport = useMemo<AudioTransport>(() => ({ track: state.track, playing: state.playing, buffering: state.buffering }), [state.track, state.playing, state.buffering]);
  const analyser = useMemo<AudioAnalyser>(() => ({ getAnalyser: () => graphRef.current?.analyser ?? null }), []);
  const value = useMemo<AudioPlayerContextValue>(() => ({ ...state, ...actions }), [state, actions]);

  useEffect(() => {
    if (graphCleanupRef.current !== null) { clearTimeout(graphCleanupRef.current); graphCleanupRef.current = null; }
    const media = audioRef.current;
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      let volume = 0.8; let muted = false;
      try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null") as { volume?: unknown; muted?: unknown } | null;
        if (typeof saved?.volume === "number") volume = clamp(saved.volume, 0, 1);
        if (typeof saved?.muted === "boolean") muted = saved.muted;
      } catch { /* Use defaults for unavailable or stale browser storage. */ }
      if (audioRef.current) { audioRef.current.volume = volume; audioRef.current.muted = muted; }
      settingsReadyRef.current = true; update({ volume, muted });
    });
    // A local producer audition may use a temporary audio element. Never let it
    // overlap the global track, or let an existing audition overlap a new beat.
    function audioFocus(event: Event) {
      const target = event.target;
      if (!(target instanceof HTMLAudioElement)) return;
      if (target !== audioRef.current) { if (!audioRef.current?.paused) pause(); return; }
      document.querySelectorAll("audio").forEach((other) => { if (other !== target && !other.paused) other.pause(); });
    }
    document.addEventListener("play", audioFocus, true);
    return () => {
      active = false;
      document.removeEventListener("play", audioFocus, true);
      pause();
      media?.pause();
      const graph = graphRef.current;
      // Strict Mode and Fast Refresh replay effects while preserving the audio
      // element. Closing its context would permanently silence that element:
      // browsers allow createMediaElementSource only once per media element.
      graphCleanupRef.current = setTimeout(() => {
        if (graph && !graph.audio.isConnected) {
          graph.source.disconnect(); graph.analyser?.disconnect();
          void graph.context.close().catch(() => undefined);
          if (graphRef.current === graph) graphRef.current = null;
        }
      }, 0);
    };
  }, [pause, update]);

  useEffect(() => {
    function shortcuts(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || !stateRef.current.track ||
          document.querySelector('[role="dialog"][aria-modal="true"]') ||
          (event.target instanceof Element && event.target.closest("input, textarea, select, button, a, [contenteditable]"))) return;
      switch (event.key.toLowerCase()) {
        case " ": event.preventDefault(); toggle(); break;
        case "arrowleft": event.preventDefault(); skip(-5); break;
        case "arrowright": event.preventDefault(); skip(5); break;
        case "m": event.preventDefault(); toggleMuted(); break;
      }
    }
    document.addEventListener("keydown", shortcuts);
    return () => document.removeEventListener("keydown", shortcuts);
  }, [skip, toggle, toggleMuted]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;
    const track = state.track;
    if (track && "MediaMetadata" in window) {
      const artwork: MediaImage[] = track.coverUrl ? [{ src: new URL(track.coverUrl, window.location.href).href }] : [];
      session.metadata = new MediaMetadata({ title: track.title, artist: track.artist, album: track.isDemo ? "BeatMarketplace listening room" : "BeatMarketplace preview", artwork });
    } else session.metadata = null;
    const handlers: Partial<Record<MediaSessionAction, MediaSessionActionHandler>> = {
      play: () => { const current = stateRef.current; if (current.track && (audioRef.current?.paused || current.error)) loadTrack(current.track, current.queue, { recordHistory: false }); },
      pause, previoustrack: previous, nexttrack: next,
      seekbackward: (details) => skip(-(details.seekOffset ?? 10)),
      seekforward: (details) => skip(details.seekOffset ?? 10),
      seekto: (details) => { if (details.seekTime !== undefined) seek(details.seekTime); },
      stop: clear,
    };
    for (const action of Object.keys(handlers) as MediaSessionAction[]) {
      try { session.setActionHandler(action, track ? handlers[action] ?? null : null); } catch { /* Action availability differs by browser. */ }
    }
    return () => { for (const action of Object.keys(handlers) as MediaSessionAction[]) { try { session.setActionHandler(action, null); } catch { /* Unsupported action. */ } } };
  }, [state.track, clear, loadTrack, next, pause, previous, seek, skip]);
  useEffect(() => { if ("mediaSession" in navigator) navigator.mediaSession.playbackState = state.track ? state.playing ? "playing" : "paused" : "none"; }, [state.track, state.playing]);

  return <ActionsContext.Provider value={actions}><AnalyserContext.Provider value={analyser}><TransportContext.Provider value={transport}><PlayerContext.Provider value={value}>
    {children}
    <audio ref={audioRef} data-global-audio="true" crossOrigin="anonymous" preload="none"
      onLoadedMetadata={loadedMetadata} onDurationChange={loadedMetadata} onTimeUpdate={() => syncProgress()} onProgress={() => syncProgress(true)}
      onSeeking={() => { const audio = audioRef.current; if (audio && stateRef.current.duration > 0 && audio.currentTime > stateRef.current.duration) audio.currentTime = stateRef.current.duration; syncProgress(true); }}
      onSeeked={() => syncProgress(true)} onEnded={finishTrack}
      onPlaying={() => { if (intendedPlayRef.current) update({ playing: true, buffering: false, slowConnection: false, error: null }); else audioRef.current?.pause(); }}
      onPause={() => { if (audioRef.current?.paused && !stateRef.current.buffering) intendedPlayRef.current = false; update({ playing: false, buffering: false }); }}
      onWaiting={() => { if (intendedPlayRef.current) update({ buffering: true }); }}
      onStalled={() => { if (intendedPlayRef.current && !audioRef.current?.paused) update({ buffering: true }); }}
      onCanPlay={() => { if (!intendedPlayRef.current || !audioRef.current?.paused) update({ buffering: false }); }}
      onVolumeChange={() => { const audio = audioRef.current; if (audio && settingsReadyRef.current) { update({ volume: audio.volume, muted: audio.muted }); persistSettings(audio.volume, audio.muted); } }}
      onError={() => { if (!stateRef.current.track || audioRef.current?.error?.code === 1) return; intendedPlayRef.current = false; update({ playing: false, buffering: false, error: mediaErrorMessage(audioRef.current?.error?.code) }); }} />
  </PlayerContext.Provider></TransportContext.Provider></AnalyserContext.Provider></ActionsContext.Provider>;
}

export function useAudioPlayer() { const value = useContext(PlayerContext); if (!value) throw new Error("AudioPlayerProvider is required."); return value; }
export function useAudioActions() { const value = useContext(ActionsContext); if (!value) throw new Error("AudioPlayerProvider is required."); return value; }
export function useAudioTransport() { const value = useContext(TransportContext); if (!value) throw new Error("AudioPlayerProvider is required."); return value; }
export function useAudioAnalyser() { const value = useContext(AnalyserContext); if (!value) throw new Error("AudioPlayerProvider is required."); return value; }
