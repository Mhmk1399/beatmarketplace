"use client";

import useSWR from "swr";
import { useAuth } from "@/components/auth/AuthProvider";
import { synchronizeDiscountClock } from "@/components/discounts/clock";
import { DETAIL_CACHE_PREFIX, type TrackDetailKey } from "@/lib/marketplace/detail-cache";
import type { MarketplaceTrack } from "@/lib/marketplace/types";
import { tableCacheScope } from "@/lib/workspace/table-cache";

export type TrackDetailResponse = { track: MarketplaceTrack; viewToken: string | null; serverTime: string | null; receivedAt: number };
class TrackDetailError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function fetchTrackDetail([, , id]: TrackDetailKey): Promise<TrackDetailResponse> {
  const response = await fetch(`/api/tracks/${id}`, { cache: "no-store", credentials: "same-origin" });
  const data = await response.json();
  if (!response.ok) throw new TrackDetailError(data.error || "Track unavailable.", response.status);
  if (data.track?.id !== id) throw new TrackDetailError("This beat could not load. Please try again.", 502);
  return { track: data.track, viewToken: typeof data.viewToken === "string" ? data.viewToken : null, serverTime: data.serverTime || response.headers.get("date"), receivedAt: Date.now() };
}

export function useTrackDetail(id: string) {
  const { user, status } = useAuth();
  const scope = tableCacheScope(user) ?? "guest";
  const key: TrackDetailKey | null = status === "loading" ? null : [DETAIL_CACHE_PREFIX, scope, id];
  const result = useSWR<TrackDetailResponse, TrackDetailError, TrackDetailKey | null>(key, fetchTrackDetail, {
    dedupingInterval: 60000,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 0,
    keepPreviousData: false,
    errorRetryCount: 1,
    shouldRetryOnError: error => !error.status || error.status >= 500,
    onSuccess(data) {
      // Cached mounts must never rewind the shared discount clock.
      synchronizeDiscountClock(data.serverTime);
    },
  });
  return { ...result, scope, isLoading: status === "loading" || result.isLoading };
}
