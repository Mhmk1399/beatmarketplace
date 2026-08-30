import { DiscoveryPreview } from "@/components/home/DiscoveryPreview";
import { FinalCTA } from "@/components/home/FinalCTA";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { MoodExplorer } from "@/components/home/MoodExplorer";
import { ProducerSection } from "@/components/home/ProducerSection";
import { PublicShell } from "@/components/public/PublicShell";

export default function HomePage() {
  return (
    <PublicShell>
      <Hero />
      <DiscoveryPreview />
      <MoodExplorer />
      <ProducerSection />
      <HowItWorks />
      <FinalCTA />
    </PublicShell>
  );
}
