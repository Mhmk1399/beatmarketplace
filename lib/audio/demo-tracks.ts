import type { AudioTrack } from "@/lib/audio/types";

/** Cropped demo previews used by catalog fallback cards and audio diagnostics. */
const originals: Omit<AudioTrack, "src" | "coverUrl">[] = [
  {
    id: "demo-die-trying",
    title: "Die Trying",
    artist: "Listening room · 01",
    description: "An eclipse on the cover. A whole world in your headphones. Hear a 30-second listening preview.",
    href: "/#listening-room",
    isDemo: true,
  },
  {
    id: "demo-qw",
    title: "QW",
    artist: "Listening room · 02",
    description: "One more reason to stay in the zone. A fresh signal for your next listening session, in a 30-second preview.",
    href: "/#listening-room",
    isDemo: true,
  },
  {
    id: "demo-coco",
    title: "Coco",
    artist: "Listening room · 03",
    description: "A new color in the listening room. Press play and find the moment that stays with you.",
    href: "/#listening-room",
    isDemo: true,
  },
  {
    id: "demo-codi",
    title: "Codi",
    artist: "Listening room · 04",
    description: "Another sound to explore. Hear a 30-second preview in your shared music player.",
    href: "/#listening-room",
    isDemo: true,
  },
  {
    id: "demo-lovesick",
    title: "LoveSick",
    artist: "Listening room · 05",
    description: "One more reason to keep listening. A 30-second preview, ready whenever you are.",
    href: "/#listening-room",
    isDemo: true,
  },
];

/** Actual cropped listening previews; originals stay outside public/. */
export const demoTracks: AudioTrack[] = originals.map(track => ({
  ...track,
  durationLimitSeconds: 30,
  src: `/api/home/media/${track.id}-128`,
  lowDataSrc: `/api/home/media/${track.id}-96`,
  coverUrl: `/api/home/media/${track.id}-cover`,
}));
