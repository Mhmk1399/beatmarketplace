"use client";

import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";
import { useAuth } from "@/components/auth/AuthProvider";
import { apiRequest, type ApiRequestError } from "@/components/studio/shared";
import { synchronizeDiscountClock } from "@/components/discounts/clock";
import { tableAffectedByMutation, tableCacheKey, tableCacheScope, type TableCacheKey } from "@/lib/workspace/table-cache";
import { tableCacheOptions } from "./TableCacheProvider";

export function useWorkspaceData<T>(url: string | null, { quiet = false }: { quiet?: boolean } = {}) {
  const { user, status } = useAuth(), { mutate } = useSWRConfig();
  const scope = status === "authenticated" ? tableCacheScope(user) : null;
  const key = tableCacheKey(scope, url);
  const result = useSWR<T, ApiRequestError, TableCacheKey | null>(key, ([, , requestUrl]) => apiRequest<T>(requestUrl, { quiet }), {
    ...tableCacheOptions,
    onSuccess(data) {
      // SWR calls this only for accepted responses, not cached mounts or discarded races.
      if (data && typeof data === "object" && "serverTime" in data && typeof data.serverTime === "string") synchronizeDiscountClock(data.serverTime);
    },
  });
  const refresh = useCallback(async () => {
    if (!scope || !url) return;
    await mutate(candidate => tableAffectedByMutation(candidate, { url }, scope), undefined, { revalidate: true, throwOnError: false });
  }, [mutate, scope, url]);
  return { ...result, refresh, isLoading: status === "loading" || result.isLoading };
}
