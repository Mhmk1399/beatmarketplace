export type DemoTrack = {
  title: string;
  producer: string;
  genre: string;
  bpm: number;
  musicalKey: string;
  artworkClass: string;
  accent: string;
};

export const demoTracks: DemoTrack[] = [
  { title: "Midnight Shift", producer: "Ari Vance", genre: "Melodic Trap", bpm: 140, musicalKey: "C♯m", artworkClass: "artwork-nocturne", accent: "violet" },
  { title: "Amber Static", producer: "Mila North", genre: "Alt R&B", bpm: 94, musicalKey: "F♯m", artworkClass: "artwork-ember", accent: "rose" },
  { title: "Tidal Memory", producer: "Low Meridian", genre: "Ambient", bpm: 118, musicalKey: "D Maj", artworkClass: "artwork-tidal", accent: "cyan" },
  { title: "After Orbit", producer: "Nox Club", genre: "Electronic", bpm: 126, musicalKey: "A min", artworkClass: "artwork-orbit", accent: "magenta" },
];

export const demoMoods = ["Dark", "Euphoric", "Cinematic", "Energetic", "Melancholic", "Aggressive", "Dreamy", "Soulful"];

export const waveformHeights = [28, 46, 21, 62, 39, 70, 48, 83, 34, 57, 76, 45, 68, 29, 52, 86, 43, 65, 36, 74, 51, 80, 32, 59, 41, 67, 25, 48, 72, 38, 61, 31];
