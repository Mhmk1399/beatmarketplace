import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { acquireVisitSlot, recordTrackVisit } from "@/lib/analytics/record";
import { VIEW_REMAINING_HEADER } from "@/lib/analytics/constants";
import { trackVisitorKey, verifyViewToken } from "@/lib/analytics/token";
import { readJson, requireOrigin } from "@/lib/workspace/server";

export const runtime = "nodejs";
const schema = z.object({ browserId: z.uuid(), token: z.string().min(1).max(512) }).strict();
const empty = (status = 204, headers?: Record<string, string>) => new NextResponse(null, { status, headers: { "Cache-Control": "private, no-store", ...headers } });
const accepted = (until: number) => empty(204, { [VIEW_REMAINING_HEADER]: String(Math.max(0, until - Date.now())) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let release: ((until?: number) => void) | undefined;
  try {
    requireOrigin(request);
    if (!request.headers.get("origin") || request.headers.get("dnt") === "1" || request.headers.get("sec-gpc") === "1"
      || /bot|spider|crawl|slurp|headless|lighthouse|preview/i.test(request.headers.get("user-agent") ?? "")
      || /prefetch|prerender/i.test(`${request.headers.get("purpose") ?? ""} ${request.headers.get("sec-purpose") ?? ""}`)) return empty();
    const { id } = await params;
    if (!/^[a-f\d]{24}$/i.test(id)) return empty();
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) return empty();
    if (!verifyViewToken(parsed.data.token, id)) return empty(409);
    const visitorKey = trackVisitorKey(id, parsed.data.browserId), slot = acquireVisitSlot(visitorKey);
    if (typeof slot === "number") return accepted(slot);
    if (slot === "busy") return empty(429, { "Retry-After": "5" });
    release = slot;
    await connectToDatabase();
    const until = await recordTrackVisit(id, visitorKey);
    slot(until);
    release = undefined;
    return accepted(until);
  } catch (error) {
    if (error instanceof SyntaxError) return empty();
    if (error instanceof Error && "status" in error && typeof error.status === "number" && [400, 403, 413, 415].includes(error.status)) return empty();
    console.error("Beat analytics write failed", error instanceof Error ? error.name : "Unknown error");
    return empty(503, { "Retry-After": "5" });
  } finally { release?.(); }
}
