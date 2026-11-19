import type { Metadata } from "next";
import { MarketplaceBrowser } from "@/components/marketplace/MarketplaceBrowser";
import { PublicShell } from "@/components/public/PublicShell";
import { browseParams, readBrowseFilters } from "@/lib/marketplace/browse";

export const metadata: Metadata = { title: "Explore beats", description: "Find your next sound. Discover original beats, listen to producer-selected previews, and choose a license for your next release." };

export default async function MarketplacePage({ searchParams }: PageProps<"/marketplace">) {
  const params = new URLSearchParams();
  Object.entries(await searchParams).forEach(([name, value]) => { if (typeof value === "string") params.set(name, value); });
  const initialFilters = readBrowseFilters(params);
  return (
    <PublicShell>
      <MarketplaceBrowser key={browseParams(initialFilters).toString() || "all"} initialFilters={initialFilters} />
    </PublicShell>
  );
}
