import { NextResponse } from "next/server";

export class ApiSecurityError extends Error {
  constructor(message: string, public status: number, public retryAfter?: number) { super(message); }
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(request.url).origin)) {
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
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new ApiSecurityError("The request is too large.", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown; }
  catch { throw new ApiSecurityError("Invalid JSON request.", 400); }
}
