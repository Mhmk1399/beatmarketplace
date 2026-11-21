import type { Metadata } from "next";
import { PublicShell } from "@/components/public/PublicShell";
import { SearchResults } from "@/components/search/SearchResults";
export const metadata: Metadata = { title: "Search the marketplace", robots: { index: false, follow: true } };
export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams, query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const page = Math.min(24, Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1));
  return <PublicShell><SearchResults key={`${query}:${page}`} query={query} page={page} /></PublicShell>;
}
