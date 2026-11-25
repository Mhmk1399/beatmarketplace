import { createClientId } from "@/lib/client-id";
import { VIEW_REMAINING_HEADER, VIEW_WINDOW_MS } from "./constants";

const browserKey = "beatmarketplace-analytics-browser-v1";
const visitsKey = "beatmarketplace-analytics-visits-v2";
const pending = new Set<string>();
const accepted = new Map<string, number>();

function recentVisits(now: number): Record<string, number> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(visitsKey) || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([id, until]) => /^[a-f\d]{24}$/i.test(id) && typeof until === "number" && until > now && until <= now + VIEW_WINDOW_MS).slice(-128));
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
export async function sendTrackVisit(trackId: string, token: string): Promise<"done" | "retry" | "renew"> {
  const now = Date.now(), until = Math.max(accepted.get(trackId) ?? 0, recentVisits(now)[trackId] ?? 0);
  if (pending.has(trackId) || (until > now && until <= now + VIEW_WINDOW_MS)) return "done";
  const browserId = analyticsBrowserId();
  if (!browserId) return "done";
  pending.add(trackId);
  try {
    const response = await fetch(`/api/tracks/${trackId}/view`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "same-origin", keepalive: true, cache: "no-store", body: JSON.stringify({ browserId, token }),
    });
    if (response.status === 409) return "renew";
    if (!response.ok) return response.status === 429 || response.status >= 500 ? "retry" : "done";
    const remaining = Number(response.headers.get(VIEW_REMAINING_HEADER));
    if (!Number.isFinite(remaining) || remaining <= 0) return "done";
    const at = Date.now();
    const validUntil = at + Math.min(remaining, VIEW_WINDOW_MS);
    if (accepted.size >= 128) accepted.delete(accepted.keys().next().value!);
    accepted.set(trackId, validUntil);
    try { localStorage.setItem(visitsKey, JSON.stringify(Object.fromEntries([...Object.entries(recentVisits(at)), [trackId, validUntil]].slice(-128)))); } catch { /* The bounded in-memory gate still works. */ }
    return "done";
  } catch { return "retry"; }
  finally { pending.delete(trackId); }
}
