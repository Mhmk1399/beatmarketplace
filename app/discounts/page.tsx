import type { Metadata } from "next";
import Link from "next/link";
import { Catalog } from "@/components/marketplace/Catalog";
import { PublicShell } from "@/components/public/PublicShell";
import { ArrowRightIcon, TagIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Limited-time beat offers", description: "Discover active producer offers, compare original and discounted prices, and find your next beat before the countdown ends." };

export default function DiscountsPage() {
  return (
    <PublicShell>
      <div className="music-catalog-page mx-auto max-w-7xl px-5 pb-20 pt-9 sm:pt-14">
        <header className="music-catalog-hero music-offers-hero">
          <div className="relative z-10 min-w-0">
            <p className="music-eyebrow"><TagIcon className="size-4" /> Producer offers · Limited time</p>
            <h1>The right sound.<br /><span className="text-gradient">A better moment.</span></h1>
            <p className="music-catalog-lead">Original beats. Special prices. A little time to make them yours. Each offer is set by its producer, with a countdown you can count on.</p>
            <div className="music-catalog-hero-bottom"><span><span className="music-status-dot" /> Only active offers</span><Link href="/marketplace">Browse all beats <ArrowRightIcon className="size-4" /></Link></div>
          </div>
          <div className="music-collection-art" aria-hidden="true"><div className="music-collection-disc"><i /><TagIcon /></div><span className="music-collection-label">GOOD SOUND. GOOD TIMING.</span><span className="music-collection-caption">CHOSEN BY THE PRODUCERS</span></div>
        </header>
        <Catalog discounted />
      </div>
    </PublicShell>
  );
}
