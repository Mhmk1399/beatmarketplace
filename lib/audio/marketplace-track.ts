import type { AudioTrack } from "@/lib/audio/types";
import type { MarketplaceTrack } from "@/lib/marketplace/types";

export function marketplaceAudioTrack(track: MarketplaceTrack): AudioTrack {
  return {
    id: track.id,
    title: track.title,
    artist: track.producerName,
    src: track.previewUrl || "",
    coverUrl: track.artworkUrl,
    description: track.description,
    href: `/tracks/${track.id}`,
    durationLimitSeconds: Math.min(30, track.previewDurationSeconds || 30),
  };
}
