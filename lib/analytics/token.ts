import { createHmac, timingSafeEqual } from "node:crypto";
import { getJwtSecret } from "@/lib/config";
import { VIEW_TOKEN_TTL_MS } from "./constants";

function secret() { return process.env.ANALYTICS_SECRET || getJwtSecret(); }
function signature(payload: string) { return createHmac("sha256", secret()).update(`beat-view:v1:${payload}`).digest(); }

/** Issued only after the existing public-track visibility checks; recording needs no extra catalog query. */
export function issueViewToken(trackId: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ id: trackId, exp: now + VIEW_TOKEN_TTL_MS })).toString("base64url");
  return `${payload}.${signature(payload).toString("base64url")}`;
}

export function verifyViewToken(token: string, trackId: string, now = Date.now()) {
  if (token.length > 512) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const expected = signature(parts[0]), supplied = Buffer.from(parts[1], "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return payload.id === trackId && Number.isSafeInteger(payload.exp) && payload.exp > now && payload.exp <= now + VIEW_TOKEN_TTL_MS;
  } catch { return false; }
}

export function trackVisitorKey(trackId: string, browserId: string) {
  return createHmac("sha256", secret()).update(`beat-visitor:v1:${trackId}:${browserId.toLowerCase()}`).digest("hex");
}
