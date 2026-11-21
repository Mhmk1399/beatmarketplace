import type { AudioTrack } from "@/lib/audio/types";
import type { MarketplaceTrack } from "@/lib/marketplace/types";
import { trackHref } from "@/lib/marketplace/track-url";

export function marketplaceAudioTrack(track: MarketplaceTrack): AudioTrack {
  return {
    id: track.id,
    title: track.title,
    artist: track.producerName,
    src: track.previewUrl || "",
    coverUrl: track.artworkUrl,
    description: track.description,
    href: trackHref(track),
    durationLimitSeconds: Math.min(30, track.previewDurationSeconds || 30),
  };
}
