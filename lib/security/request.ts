import { NextResponse } from "next/server";

export class ApiSecurityError extends Error {
  constructor(message: string, public status: number, public retryAfter?: number) { super(message); }
}

/**
 * Next can normalize request.url to localhost behind a development or reverse
 * proxy even though the browser used the public Host. Compare the browser
 * Origin with both representations so legitimate same-origin writes work,
 * while a cross-site browser Origin still fails closed.
 */
export function isSameRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  let supplied: URL;
  try { supplied = new URL(origin); } catch { return false; }
  if (!["http:", "https:"].includes(supplied.protocol) || supplied.username || supplied.password || supplied.pathname !== "/" || supplied.search || supplied.hash) return false;

  const allowed = new Set([new URL(request.url).origin]);
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim();
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https" ? `${forwardedProtocol}:` : new URL(request.url).protocol;
  for (const value of [request.headers.get("host"), request.headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim()]) {
    if (!value || /[\s/@\\]/.test(value)) continue;
    try { allowed.add(new URL(`${protocol}//${value}`).origin); } catch { /* Invalid proxy header: ignore it. */ }
  }
  return allowed.has(supplied.origin);
}

export function requireSameOrigin(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site" || !isSameRequestOrigin(request)) {
    throw new ApiSecurityError("This request must come from this website.", 403);
  }
}

export function securityErrorResponse(error: unknown) {
  if (!(error instanceof ApiSecurityError)) return null;
  return NextResponse.json({ error: error.message }, { status: error.status, headers: {
    "Cache-Control": "private, no-store",
    ...(error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {}),
  } });
}

/** Bound streamed JSON before parsing, including requests without Content-Length. */
export async function readSecureJson(request: Request, maxBytes = 16_384) {
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    throw new ApiSecurityError("Use a JSON request.", 415);
  }
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) throw new ApiSecurityError("The request is too large.", 413);
  if (!request.body) throw new ApiSecurityError("A request body is required.", 400);
  const reader = request.body.getReader();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => undefined); }, 30_000);
  const abort = () => { void reader.cancel().catch(() => undefined); };
  request.signal.addEventListener("abort", abort, { once: true });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (timedOut) throw new ApiSecurityError("The request took too long.", 408);
      if (request.signal.aborted) throw new ApiSecurityError("The request was cancelled.", 400);
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new ApiSecurityError("The request is too large.", 413); }
      chunks.push(value);
    }
  } finally { clearTimeout(timeout); request.signal.removeEventListener("abort", abort); reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown; }
  catch { throw new ApiSecurityError("Invalid JSON request.", 400); }
}
