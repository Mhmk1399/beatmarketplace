"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { sendTrackVisit } from "@/lib/analytics/client";
import { VIEW_VISIBLE_MS } from "@/lib/analytics/constants";

/** No state updates, layout work, player subscriptions or extra catalog requests. */
export function TrackVisit({ id, producerId, token }: { id: string; producerId: string; token: string | null }) {
  const { user, status } = useAuth();
  const excluded = status === "loading" || user?.id === producerId || Boolean(user?.roles.includes("ADMIN"));
  useEffect(() => {
    if (!token || excluded || navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    let timer: ReturnType<typeof setTimeout> | undefined, idle: number | undefined;
    let qualified = false, issued = false, disposed = false, attempts = 0;
    function clearPending() { clearTimeout(timer); if (idle !== undefined) window.cancelIdleCallback(idle); }
    async function send() {
      if (issued) return;
      issued = true; attempts++;
      const complete = await sendTrackVisit(id, token!);
      if (!complete && !disposed && attempts < 2 && document.visibilityState === "visible") {
        timer = setTimeout(() => { issued = false; void send(); }, 5000 + Math.random() * 2000);
      }
    }
    function visibility() {
      clearPending();
      if (document.visibilityState !== "visible") { if (qualified && !issued) void send(); return; }
      if (issued) return;
      timer = setTimeout(() => {
        qualified = true;
        if ("requestIdleCallback" in window) idle = window.requestIdleCallback(() => { void send(); }, { timeout: 1000 });
        else void send();
      }, VIEW_VISIBLE_MS);
    }
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true; clearPending(); document.removeEventListener("visibilitychange", visibility);
      if (qualified && !issued) void send();
    };
  }, [id, token, excluded]);
  return null;
}
