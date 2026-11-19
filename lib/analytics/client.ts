import { createClientId } from "@/lib/client-id";
import { VIEW_WINDOW_MS } from "./constants";

const browserKey = "beatmarketplace-analytics-browser-v1";
const visitsKey = "beatmarketplace-analytics-visits-v1";
const pending = new Set<string>();
const accepted = new Map<string, number>();

function recentVisits(now: number): Record<string, number> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(visitsKey) || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([id, at]) => /^[a-f\d]{24}$/i.test(id) && typeof at === "number" && at <= now && at > now - VIEW_WINDOW_MS).slice(-128));
  } catch { return {}; }
}

/** Blocked storage means no visitor ID and no tracking, rather than a new visitor on every refresh. */
export function analyticsBrowserId() {
  try {
    const existing = localStorage.getItem(browserKey);
    if (existing && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(existing)) return existing;
    const id = createClientId(); localStorage.setItem(browserKey, id); return id;
  } catch { return null; }
}

/** There is no polling and at most one bounded retry of a qualified page visit. */
export async function sendTrackVisit(trackId: string, token: string) {
  const now = Date.now(), last = Math.max(accepted.get(trackId) ?? 0, recentVisits(now)[trackId] ?? 0);
  if (pending.has(trackId) || (last > now - VIEW_WINDOW_MS && last <= now)) return true;
  const browserId = analyticsBrowserId();
  if (!browserId) return true;
  pending.add(trackId);
  try {
    const response = await fetch(`/api/tracks/${trackId}/view`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "same-origin", keepalive: true, cache: "no-store", body: JSON.stringify({ browserId, token }),
    });
    if (!response.ok) return response.status < 429;
    const at = Date.now();
    if (accepted.size >= 128) accepted.delete(accepted.keys().next().value!);
    accepted.set(trackId, at);
    try { localStorage.setItem(visitsKey, JSON.stringify(Object.fromEntries([...Object.entries(recentVisits(at)), [trackId, at]].slice(-128)))); } catch { /* The bounded in-memory gate still works. */ }
    return true;
  } catch { return false; }
  finally { pending.delete(trackId); }
}
