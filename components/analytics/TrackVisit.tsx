"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { sendTrackVisit } from "@/lib/analytics/client";
import { VIEW_VISIBLE_MS } from "@/lib/analytics/constants";

/** No state updates, layout work, player subscriptions or extra catalog requests. */
export function TrackVisit({ id, producerId, token, onTokenExpired }: { id: string; producerId: string; token: string | null; onTokenExpired: () => void }) {
  const { user, status } = useAuth();
  const excluded = status === "loading" || user?.id === producerId;
  const renewed = useRef(false);
  useEffect(() => {
    if (!token || excluded || navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    let timer: ReturnType<typeof setTimeout> | undefined, idle: number | undefined;
    let qualified = false, issued = false, disposed = false, attempts = 0, retryAt = 0;
    function clearPending() { clearTimeout(timer); if (idle !== undefined) window.cancelIdleCallback(idle); }
    function retryWhenVisible() {
      if (!disposed && attempts < 2 && document.visibilityState === "visible") {
        timer = setTimeout(() => { void send(); }, Math.max(0, retryAt - Date.now()));
      }
    }
    async function send() {
      if (issued || attempts >= 2) return;
      issued = true; attempts++;
      const outcome = await sendTrackVisit(id, token!);
      if (outcome === "renew" && !disposed && !renewed.current) {
        renewed.current = true;
        onTokenExpired();
      }
      if (outcome === "retry") {
        issued = false;
        retryAt = Date.now() + 5000 + Math.random() * 2000;
        retryWhenVisible();
      }
    }
    function visibility() {
      clearPending();
      if (document.visibilityState !== "visible") { if (qualified && attempts === 0) void send(); return; }
      if (issued) return;
      if (qualified) { retryWhenVisible(); return; }
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
      if (qualified && attempts === 0) void send();
    };
  }, [id, token, excluded, onTokenExpired]);
  return null;
}
