export const TABLE_CACHE_PREFIX = "workspace-table";
export type TableCacheKey = readonly [typeof TABLE_CACHE_PREFIX, string, string];
export type TableMutation = { url: string; kind?: string };

export function tableCacheScope(user: { id: string; roles: readonly string[] } | null) {
  return user ? `${user.id}:${[...user.roles].sort().join(",")}` : null;
}

export function canonicalTableUrl(value: string) {
  const url = new URL(value, "https://workspace.invalid");
  url.searchParams.sort();
  return `${url.pathname}${url.search}`;
}

export function tableCacheKey(scope: string | null, url: string | null): TableCacheKey | null {
  return scope && url ? [TABLE_CACHE_PREFIX, scope, canonicalTableUrl(url)] : null;
}

export function isTableCacheKey(key: unknown, scope?: string): key is TableCacheKey {
  return Array.isArray(key) && key.length === 3 && key[0] === TABLE_CACHE_PREFIX && typeof key[1] === "string" && typeof key[2] === "string" && (scope === undefined || key[1] === scope);
}

function family(path: string) {
  if (path === "/api/workspace/track-analytics") return "track-analytics";
  if (/^\/api\/(admin\/)?users(?:\/|$)/.test(path)) return "users";
  if (/^\/api\/(admin\/)?tracks(?:\/|$)/.test(path) || path.startsWith("/api/studio/tracks/")) return "tracks";
  if (/^\/api\/(admin\/)?contact(?:\/|$)/.test(path)) return "contact";
  if (/^\/api\/(admin\/)?hero(?:\/|$)/.test(path)) return "hero";
  if (path === "/api/workspace/orders" || path.startsWith("/api/payments/")) return "orders";
  return path.split("/")[2];
}

/** Invalidate every cached search/page for changed resources, including unmounted tables. */
export function tableAffectedByMutation(key: unknown, mutation: TableMutation, scope: string) {
  if (!isTableCacheKey(key, scope)) return false;
  const changed = new URL(mutation.url, "https://workspace.invalid"), cached = new URL(key[2], "https://workspace.invalid");
  const source = family(changed.pathname), target = family(cached.pathname);
  const dependencies: Record<string, readonly string[]> = {
    users: ["users", "tracks", "hero", "orders", "collections"],
    account: ["users", "tracks", "hero", "orders"],
    producers: ["users", "tracks", "hero"],
    tracks: ["tracks", "contracts", "discounts", "hero", "collections", "track-analytics"],
    contracts: ["contracts", "tracks", "hero"],
    discounts: ["discounts", "tracks", "hero"],
    taxonomy: ["taxonomy", "tracks"],
  };
  if (!(dependencies[source] ?? [source]).includes(target)) return false;
  if (source === "taxonomy" && target === "taxonomy") {
    const kind = mutation.kind ?? changed.searchParams.get("kind");
    return !kind || cached.searchParams.get("kind") === kind;
  }
  return true;
}

type Listener = (mutation: TableMutation) => Promise<unknown>;
const listeners = new Set<Listener>();
export function subscribeToTableMutations(listener: Listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Successful writes only; a failed refresh must never turn a saved write into a reported failure. */
export async function notifyTableMutation(url: string, body?: BodyInit | null) {
  if (typeof window === "undefined") return;
  let kind: string | undefined;
  if (typeof body === "string") {
    try { const parsed = JSON.parse(body); if (["genres", "moods", "instruments"].includes(parsed?.kind)) kind = parsed.kind; } catch { /* Not a JSON mutation. */ }
  }
  const mutation = { url: canonicalTableUrl(url), ...(kind ? { kind } : {}) };
  await Promise.allSettled([...listeners].map(listener => Promise.resolve().then(() => listener(mutation))));
}
