/** One source shared by every play button, the dock, and track frequency visualizers. */
export type AudioTrack = {
  id: string;
  title: string;
  artist: string;
  src: string;
  lowDataSrc?: string;
  downloadSrc?: string;
  coverUrl: string | null;
  description: string;
  href?: string;
  /** Public listening previews are capped at 30 seconds. */
  durationLimitSeconds?: number;
  isDemo?: boolean;
};

export type RepeatMode = "off" | "all" | "one";

export type AudioPlayerState = {
  track: AudioTrack | null;
  queue: AudioTrack[];
  queueIndex: number;
  playing: boolean;
  buffering: boolean;
  elapsed: number;
  duration: number;
  buffered: number;
  volume: number;
  muted: boolean;
  repeat: RepeatMode;
  shuffle: boolean;
  error: string | null;
  quality: "standard" | "data-saver";
  slowConnection: boolean;
  offline: boolean;
};

export type AudioPlayerActions = {
  play: (track: AudioTrack, queue?: AudioTrack[]) => void;
  toggle: (track?: AudioTrack, queue?: AudioTrack[]) => void;
  pause: () => void;
  seek: (seconds: number) => void;
  skip: (seconds: number) => void;
  previous: () => void;
  next: () => void;
  setVolume: (value: number) => void;
  toggleMuted: () => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  clear: () => void;
  enqueue: (track: AudioTrack) => void;
  removeFromQueue: (id: string) => void;
  retry: () => void;
  setQuality: (quality: "standard" | "data-saver") => void;
};

export type AudioPlayerContextValue = AudioPlayerState & AudioPlayerActions;
export type AudioTransport = Pick<AudioPlayerState, "track" | "playing" | "buffering">;
export type AudioAnalyser = { getAnalyser: () => AnalyserNode | null };
