import type { TableMutation } from "@/lib/workspace/table-cache";

export const DETAIL_CACHE_PREFIX = "track-detail";
export type TrackDetailKey = readonly [typeof DETAIL_CACHE_PREFIX, string, string];

export function isTrackDetailKey(key: unknown): key is TrackDetailKey {
  return Array.isArray(key) && key.length === 3 && key[0] === DETAIL_CACHE_PREFIX && typeof key[1] === "string" && typeof key[2] === "string";
}

export function detailAffectedByMutation(key: unknown, mutation: TableMutation, scope: string) {
  if (!isTrackDetailKey(key) || key[1] !== scope) return false;
  const path = new URL(mutation.url, "https://workspace.invalid").pathname;
  const track = path.match(/^\/api\/(?:admin\/)?tracks(?:\/([a-f\d]{24}))?(?:\/|$)/i);
  if (track) return !track[1] || key[2] === track[1];
  return /^\/api\/(?:admin\/)?(?:contracts|discounts|taxonomy|users|producers|account)(?:\/|$)/.test(path);
}
