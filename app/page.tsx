import { StudioMarketplace } from "@/components/home/StudioMarketplace";
import { FinalCTA } from "@/components/home/FinalCTA";
import { Hero } from "@/components/home/Hero";
import { HeroBackdrop } from "@/components/home/HeroBackdrop";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ListeningRoom } from "@/components/home/ListeningRoom";
import { ProducerSection } from "@/components/home/ProducerSection";
import { TrendingBeats } from "@/components/home/TrendingBeats";
import { GenreExplorer } from "@/components/home/GenreExplorer";
import { SoundDiscovery } from "@/components/home/SoundDiscovery";
import { PublicShell } from "@/components/public/PublicShell";
import { getHomePlacements, getHomeTaxonomy, getHomeTracks } from "@/lib/home/catalog";
import { editorialImage, editorialPicture, getHomeMedia } from "@/lib/home/media";
import type { Metadata } from "next";
import { connection } from "next/server";

export const metadata: Metadata = {
  title: "Buy Original Beats & Compare Licenses",
  description: "Discover original beats, hear producer-selected 30-second previews, compare licenses in toman, and download your WAV files after verified payment.",
};

export default async function HomePage() {
  await connection();
  const [catalog, genres, moods, instruments, placements, media] = await Promise.all([
    getHomeTracks().catch(() => null),
    getHomeTaxonomy("genres").catch(() => []),
    getHomeTaxonomy("moods").catch(() => []),
    getHomeTaxonomy("instruments").catch(() => []),
    getHomePlacements().catch(() => []),
    getHomeMedia().catch(() => ({})),
  ]);
  const tracks = catalog?.latest ?? [];
  const serverTime = new Date().toISOString();

  return (
    <PublicShell overlayNavbar>
      <div className="music-home">
        <div className="music-home-opening" data-hero-space>
          <HeroBackdrop />
          <Hero placements={placements} tracks={tracks.slice(0, 5)} serverTime={serverTime} />
          <ListeningRoom tracks={tracks.slice(0, 6)} />
        </div>
        <div className="music-home-catalog">
          <TrendingBeats tracks={catalog?.trending ?? []} headphonesUrl={editorialImage(media, "trending-headphones")?.src ?? null} />
          {genres.length > 0 && <GenreExplorer categories={genres} />}
          <SoundDiscovery moods={moods} instruments={instruments} />
          <StudioMarketplace tracks={tracks.slice(0, 4)} image={editorialPicture(media, "marketplace-studio")} unavailable={!catalog} />
        </div>
        <div className="music-home-creation">
          <ProducerSection track={tracks[0]} image={editorialPicture(media, "producer-listening")} />
          <HowItWorks image={editorialPicture(media, "creative-flow-studio")} />
          <FinalCTA tracks={tracks.slice(0, 4)} image={editorialPicture(media, "release-producer")} />
        </div>
      </div>
    </PublicShell>
  );
}
