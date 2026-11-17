import type { Metadata } from "next";
import Link from "next/link";
import { Catalog } from "@/components/marketplace/Catalog";
import { PublicShell } from "@/components/public/PublicShell";
import { ArrowRightIcon, DiscIcon, MusicNoteIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Explore beats", description: "Find your next sound. Discover original beats, listen to producer-selected previews, and choose a license for your next release." };

export default function MarketplacePage() {
  return (
    <PublicShell>
      <div className="music-catalog-page mx-auto max-w-7xl px-5 pb-20 pt-9 sm:pt-14">
        <header className="music-catalog-hero">
          <div className="relative z-10 min-w-0">
            <p className="music-eyebrow"><DiscIcon className="size-4" /> The independent sound collection</p>
            <h1>Your next sound.<br /><span className="text-gradient">Your next chapter.</span></h1>
            <p className="music-catalog-lead">A beat that gets you. A producer who gets it.<br className="hidden sm:block" /> Discover original music and make something of your own.</p>
            <div className="music-catalog-hero-bottom"><span><MusicNoteIcon className="size-4" /> Press play. Feel it out.</span><Link href="/discounts">Explore live offers <ArrowRightIcon className="size-4" /></Link></div>
          </div>
          <div className="music-collection-art" aria-hidden="true"><div className="music-collection-disc"><i /><DiscIcon /></div><span className="music-collection-label">INDEPENDENT BY NATURE.</span><span className="music-collection-caption">LISTEN / DISCOVER / CREATE</span></div>
        </header>
        <Catalog />
      </div>
    </PublicShell>
  );
}
