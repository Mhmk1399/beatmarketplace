import { Catalog } from "@/components/marketplace/Catalog";
import { FinalCTA } from "@/components/home/FinalCTA";
import { Hero } from "@/components/home/Hero";
import { HeroBackdrop } from "@/components/home/HeroBackdrop";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ListeningRoom } from "@/components/home/ListeningRoom";
import { ProducerSection } from "@/components/home/ProducerSection";
import { PublicShell } from "@/components/public/PublicShell";

export default function HomePage() {
  return (
    <PublicShell overlayNavbar>
      <div className="music-home">
        <div className="music-home-opening" data-hero-space>
          <HeroBackdrop />
          <Hero />
          <ListeningRoom />
        </div>
        <section id="sounds" aria-label="Latest beats" className="music-home-section music-home-catalog"><div className="music-home-container"><Catalog compact /></div></section>
        <ProducerSection />
        <HowItWorks />
        <FinalCTA />
      </div>
    </PublicShell>
  );
}
