import type { AudioTrack, RepeatMode } from "./types";

export function clamp(value: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}

export function trackDuration(track: AudioTrack | null, sourceDuration: number) {
  const actual = Number.isFinite(sourceDuration) && sourceDuration > 0 ? sourceDuration : 0;
  const limit = track?.durationLimitSeconds;
  if (limit !== undefined && Number.isFinite(limit) && limit > 0) return actual ? Math.min(actual, limit) : limit;
  return actual;
}

export function formatAudioTime(value: number) {
  const seconds = Math.max(0, Number.isFinite(value) ? Math.floor(value) : 0);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function uniqueQueue(tracks: readonly AudioTrack[]) {
  const ids = new Set<string>();
  return tracks.filter((track) => {
    if (!track.id || !track.src || ids.has(track.id)) return false;
    ids.add(track.id);
    return true;
  }).slice(0, 200);
}

export function buildQueue(track: AudioTrack, supplied?: readonly AudioTrack[], current: readonly AudioTrack[] = []) {
  const tracks = uniqueQueue(supplied?.length ? supplied : current.length ? current : [track]);
  const existing = tracks.findIndex((item) => item.id === track.id);
  if (existing >= 0) return tracks.map((item, index) => index === existing ? track : item);
  return [...tracks.slice(0, 199), track];
}

/** Manual next always advances; repeat-one affects automatic end handling only. */
export function adjacentIndex(length: number, index: number, direction: -1 | 1, repeat: RepeatMode, shuffle: boolean, random = Math.random()) {
  if (length < 2) return -1;
  if (shuffle) {
    const choice = Math.floor(clamp(random, 0, 0.999999) * (length - 1));
    return choice >= index ? choice + 1 : choice;
  }
  const next = index + direction;
  if (next >= 0 && next < length) return next;
  if (repeat === "all") return direction === 1 ? 0 : length - 1;
  return -1;
}

export function mediaErrorMessage(code?: number) {
  switch (code) {
    case 2: return "The audio could not be downloaded. Check your connection and try again.";
    case 3: return "This audio file could not be decoded. Please try another track.";
    case 4: return "This audio source is unavailable or unsupported by your browser.";
    default: return "This track could not be played. Please try again.";
  }
}
