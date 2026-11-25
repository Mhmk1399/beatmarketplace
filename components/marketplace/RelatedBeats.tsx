"use client";

import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { marketplaceAudioTrack } from "@/lib/audio/marketplace-track";
import type { MarketplaceTrack } from "@/lib/marketplace/types";
import { BrowseBeatCard } from "./BrowseBeatCard";
import { usePublicCatalogPage } from "./useBrowseCatalog";

const limit = 4;

export function RelatedBeats({ trackId, genre }: { trackId: string; genre: NonNullable<MarketplaceTrack["genre"]> }) {
  // Fetch one extra beat so this genre-level cache also works when it contains the current beat.
  const params = new URLSearchParams({ genreId: genre.id, pageSize: String(limit + 1), pagination: "cursor" });
  const { data, error, isLoading, isValidating, mutate } = usePublicCatalogPage(`/api/tracks?${params}`);
  const related = data?.tracks.filter(beat => beat.id !== trackId && beat.genre?.id === genre.id).slice(0, limit) ?? [];
  if (!related.length && !isLoading && !error) return null;

  const queue = related.filter(beat => beat.previewUrl).map(marketplaceAudioTrack);

  return (
    <section className="detail-related music-glass" aria-labelledby="related-beats-title" aria-busy={isLoading}>
      <h2 id="related-beats-title">More <bdi>{genre.name}</bdi> beats</h2>
      {error && (
        <div className="detail-related-feedback">
          <p role="status">Could not load more beats in this genre.</p>
          <NeumorphicButton size="sm" disabled={isValidating} onClick={() => void mutate().catch(() => undefined)}>Try again</NeumorphicButton>
        </div>
      )}
      {isLoading ? (
        <div className="detail-related-grid" role="status" aria-label="Loading related beats">
          {Array.from({ length: limit }, (_, index) => <div key={index} className="market-card-skeleton" aria-hidden="true" />)}
        </div>
      ) : related.length > 0 && (
        <div className="detail-related-grid">
          {related.map(beat => <BrowseBeatCard key={beat.id} beat={beat} queue={queue} />)}
        </div>
      )}
    </section>
  );
}
