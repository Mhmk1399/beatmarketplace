import type { AudioTrack } from "@/lib/audio/types";

/** Thirty-second public demo previews shared by the hero, listening room and global player. */
const originals: Omit<AudioTrack, "src">[] = [
  {
    id: "demo-die-trying",
    title: "Die Trying",
    artist: "Listening room · 01",
    coverUrl: "/assets/covers/die-trying.svg",
    description: "An eclipse on the cover. A whole world in your headphones. Hear a 30-second listening preview.",
    href: "/#listening-room",
    isDemo: true,
  },
  {
    id: "demo-qw",
    title: "QW",
    artist: "Listening room · 02",
    coverUrl: "/assets/covers/qw.svg",
    description: "One more reason to stay in the zone. A fresh signal for your next listening session, in a 30-second preview.",
    href: "/#listening-room",
    isDemo: true,
  },
  {
    id: "demo-coco",
    title: "Coco",
    artist: "Listening room · 03",
    coverUrl: "/assets/covers/coco.svg",
    description: "A new color in the listening room. Press play and find the moment that stays with you.",
    href: "/#listening-room",
    isDemo: true,
  },
  {
    id: "demo-codi",
    title: "Codi",
    artist: "Listening room · 04",
    coverUrl: "/assets/covers/codi.svg",
    description: "Another sound to explore. Hear a 30-second preview in your shared music player.",
    href: "/#listening-room",
    isDemo: true,
  },
  {
    id: "demo-lovesick",
    title: "LoveSick",
    artist: "Listening room · 05",
    coverUrl: "/assets/covers/lovesick.svg",
    description: "One more reason to keep listening. A 30-second preview, ready whenever you are.",
    href: "/#listening-room",
    isDemo: true,
  },
];

/** Actual cropped listening previews; originals stay outside public/. */
export const demoTracks: AudioTrack[] = originals.map(track => ({
  ...track,
  durationLimitSeconds: 30,
  src: `/assets/audios/listening/${track.id}-128.mp3`,
  lowDataSrc: `/assets/audios/listening/${track.id}-96.mp3`,
}));
