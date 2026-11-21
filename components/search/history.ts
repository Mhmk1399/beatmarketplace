import { normalizeSearch } from "@/lib/search/matching";
const fallback = new Map<string, string[]>();
const key = (scope: string) => `beatmarketplace-search-history-v1:${scope}`;
export function recentSearches(scope: string): string[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(key(scope)) || "[]"); return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length >= 2 && item.length <= 100).slice(0, 10) : []; }
  catch { return fallback.get(scope) || []; }
}
export function storeSearches(scope: string, values: string[]) {
  const result = values.slice(0, 10);
  if (fallback.size > 8) fallback.delete(fallback.keys().next().value!);
  fallback.set(scope, result);
  try { localStorage.setItem(key(scope), JSON.stringify(result)); } catch { /* Session-only history remains available. */ }
  return result;
}
export function rememberSearch(scope: string, query: string) { const clean = query.trim().replace(/\s+/g, " ").slice(0, 100); if (normalizeSearch(clean).length < 2) return; storeSearches(scope, [clean, ...recentSearches(scope).filter(value => normalizeSearch(value) !== normalizeSearch(clean))]); }
