import { StudioMarketplace } from "@/components/home/StudioMarketplace";
import { FinalCTA } from "@/components/home/FinalCTA";
import { Hero } from "@/components/home/Hero";
import { HeroBackdrop } from "@/components/home/HeroBackdrop";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ListeningRoom } from "@/components/home/ListeningRoom";
import { ProducerSection } from "@/components/home/ProducerSection";
import { TrendingBeats } from "@/components/home/TrendingBeats";
import { GenreExplorer } from "@/components/home/GenreExplorer";
import { PublicShell } from "@/components/public/PublicShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buy Original Beats & Compare Licenses",
  description: "Discover original beats, hear producer-selected 30-second previews, compare licenses in toman, and download your WAV files after verified payment.",
};

export default function HomePage() {
  return (
    <PublicShell overlayNavbar>
      <div className="music-home">
        <div className="music-home-opening" data-hero-space>
          <HeroBackdrop />
          <Hero />
          <ListeningRoom />
        </div>
        <TrendingBeats />
        <GenreExplorer />
        <StudioMarketplace />
        <ProducerSection />
        <HowItWorks />
        <FinalCTA />
      </div>
    </PublicShell>
  );
}
