import type { AudioTrack } from "@/lib/audio/types";

/** User-supplied public songs shared by the hero, listening room and global player. */
const originals: AudioTrack[] = [
  {
    id: "demo-die-trying",
    title: "Die Trying",
    artist: "Listening room · 01",
    src: "/assets/audios/Die%20Trying.mp3",
    coverUrl: "/assets/covers/die-trying.svg",
    description: "An eclipse on the cover. A whole world in your headphones. Find your favorite moment in this full-length listening demo.",
    href: "/#listening-room",
    isDemo: true,
  },
  {
    id: "demo-qw",
    title: "QW",
    artist: "Listening room · 02",
    src: "/assets/audios/qw.mp3",
    coverUrl: "/assets/covers/qw.svg",
    description: "One more reason to stay in the zone. A fresh signal for your next listening session, playing from the first second to the last.",
    href: "/#listening-room",
    isDemo: true,
  },
  {
    id: "demo-coco",
    title: "Coco",
    artist: "Listening room · 03",
    src: "/assets/audios/coco.mp3",
    coverUrl: "/assets/covers/coco.svg",
    description: "A new color in the listening room. Press play and find the moment that stays with you.",
    href: "/#listening-room",
    isDemo: true,
  },
  {
    id: "demo-codi",
    title: "Codi",
    artist: "Listening room · 04",
    src: "/assets/audios/Codi.mp3",
    coverUrl: "/assets/covers/codi.svg",
    description: "Another sound to explore. Listen from beginning to end in your shared music player.",
    href: "/#listening-room",
    isDemo: true,
  },
  {
    id: "demo-lovesick",
    title: "LoveSick",
    artist: "Listening room · 05",
    src: "/assets/audios/cudi%20ft%20samiel%20-%20LoveSick%20mix%207.mp3",
    coverUrl: "/assets/covers/lovesick.svg",
    description: "One more reason to keep listening. A full-length session, ready whenever you are.",
    href: "/#listening-room",
    isDemo: true,
  },
];

/** Smaller listening copies; original downloads remain an explicit demo-only action. */
export const demoTracks: AudioTrack[] = originals.map(track => ({
  ...track,
  downloadSrc: track.src,
  src: `/assets/audios/listening/${track.id}-128.mp3`,
  lowDataSrc: `/assets/audios/listening/${track.id}-96.mp3`,
}));
