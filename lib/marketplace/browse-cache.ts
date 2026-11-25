import type { TableMutation } from "@/lib/workspace/table-cache";

const BROWSE_CACHE_PREFIX = "marketplace-browse";
export type BrowseCacheKey = readonly [typeof BROWSE_CACHE_PREFIX, string];

export function browseCacheKey(url: string): BrowseCacheKey {
  return [BROWSE_CACHE_PREFIX, url];
}

export function browseAffectedByMutation(key: unknown, mutation: TableMutation) {
  if (!Array.isArray(key) || key[0] !== BROWSE_CACHE_PREFIX || typeof key[1] !== "string") return false;

  const changed = new URL(mutation.url, "https://workspace.invalid");
  const cached = new URL(key[1], "https://workspace.invalid");
  const taxonomy = /^\/api\/(?:admin\/)?taxonomy(?:\/|$)/.test(changed.pathname);

  if (cached.pathname === "/api/taxonomy") {
    const kind = mutation.kind ?? changed.searchParams.get("kind");
    return taxonomy && (!kind || kind === cached.searchParams.get("kind"));
  }

  return cached.pathname === "/api/tracks" && (
    taxonomy || /^\/api\/(?:admin\/|studio\/)?(?:tracks|contracts|discounts|users|producers|account)(?:\/|$)/.test(changed.pathname)
  );
}
