"use client";

import { useEffect, type ReactNode } from "react";
import { SWRConfig, useSWRConfig } from "swr";
import { useAuth } from "@/components/auth/AuthProvider";
import { isTableCacheKey, subscribeToTableMutations, tableAffectedByMutation, tableCacheScope, type TableMutation } from "@/lib/workspace/table-cache";
import { detailAffectedByMutation, isTrackDetailKey } from "@/lib/marketplace/detail-cache";
import { browseAffectedByMutation } from "@/lib/marketplace/browse-cache";

// One in-memory cache per document. Navigation preserves it; a browser reload recreates it.
const configuration = { provider: () => new Map() };
export const tableCacheOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  refreshInterval: 0,
  dedupingInterval: 2000,
  shouldRetryOnError: false,
  keepPreviousData: false,
} as const;

function CacheLifecycle() {
  const { user, status } = useAuth();
  const scope = status === "authenticated" ? tableCacheScope(user) : null;
  const { mutate } = useSWRConfig();

  useEffect(() => {
    // Retire old account/role keys through SWR so pre-logout requests cannot repopulate them.
    void mutate(key => (isTableCacheKey(key) && key[1] !== scope) || (isTrackDetailKey(key) && key[1] !== (scope ?? "guest")), undefined, { revalidate: false });
    if (!scope) return;
    const invalidate = (mutation: TableMutation) => mutate(
      key => tableAffectedByMutation(key, mutation, scope) || detailAffectedByMutation(key, mutation, scope) || browseAffectedByMutation(key, mutation),
      undefined,
      { revalidate: true, throwOnError: false },
    );
    let channel: BroadcastChannel | undefined;
    try { if (typeof BroadcastChannel !== "undefined") channel = new BroadcastChannel("beatmarketplace-table-writes"); } catch { /* Cache works without cross-tab messaging. */ }
    if (channel) channel.onmessage = event => {
      const message = event.data;
      if (message?.scope === scope && typeof message.url === "string" && message.url.startsWith("/api/") && message.url.length < 2048 && (message.kind === undefined || ["genres", "moods", "instruments"].includes(message.kind))) void invalidate({ url: message.url, kind: message.kind });
    };
    const unsubscribe = subscribeToTableMutations(mutation => {
      try { channel?.postMessage({ scope, ...mutation }); } catch { /* The local mutation still invalidates. */ }
      return invalidate(mutation);
    });
    return () => { unsubscribe(); channel?.close(); };
  }, [mutate, scope]);
  return null;
}

export function TableCacheProvider({ children }: { children: ReactNode }) {
  return <SWRConfig value={configuration}><CacheLifecycle />{children}</SWRConfig>;
}
