import type { Metadata } from "next";
import { PublicShell } from "@/components/public/PublicShell";
import { ProducersDirectory } from "@/components/producers/ProducersDirectory";
import { getProducerDirectory } from "@/lib/producers/server";
export const metadata: Metadata = { title: "Independent producers", description: "Meet independent music producers, explore their studios and discover their original beats." };
export const dynamic = "force-dynamic";
export default async function ProducersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = String((await searchParams).q || "").trim().slice(0, 80);
  const initial = await getProducerDirectory({ q: query });
  return <PublicShell><ProducersDirectory initial={initial} initialQuery={query} /></PublicShell>;
}
