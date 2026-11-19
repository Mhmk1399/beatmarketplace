import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { acquireVisitSlot, recordTrackVisit } from "@/lib/analytics/record";
import { trackVisitorKey, verifyViewToken } from "@/lib/analytics/token";
import { readJson, requireOrigin } from "@/lib/workspace/server";

export const runtime = "nodejs";
const schema = z.object({ browserId: z.uuid(), token: z.string().min(1).max(512) }).strict();
const empty = () => new NextResponse(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let release: ((saved: boolean) => void) | undefined;
  try {
    requireOrigin(request);
    if (!request.headers.get("origin") || request.headers.get("dnt") === "1" || request.headers.get("sec-gpc") === "1"
      || /bot|spider|crawl|slurp|headless|lighthouse|preview/i.test(request.headers.get("user-agent") ?? "")
      || /prefetch|prerender/i.test(`${request.headers.get("purpose") ?? ""} ${request.headers.get("sec-purpose") ?? ""}`)) return empty();
    const { id } = await params;
    if (!/^[a-f\d]{24}$/i.test(id)) return empty();
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success || !verifyViewToken(parsed.data.token, id)) return empty();
    const visitorKey = trackVisitorKey(id, parsed.data.browserId), slot = acquireVisitSlot(visitorKey);
    if (slot === "duplicate") return empty();
    if (slot === "busy") return new NextResponse(null, { status: 429, headers: { "Retry-After": "5", "Cache-Control": "private, no-store" } });
    release = slot;
    await connectToDatabase();
    await recordTrackVisit(id, visitorKey);
    release(true);
    release = undefined;
    return empty();
  } catch (error) {
    if (error instanceof SyntaxError) return empty();
    if (error instanceof Error && "status" in error && typeof error.status === "number" && [400, 403, 413, 415].includes(error.status)) return empty();
    console.error("Beat analytics write failed", error instanceof Error ? error.name : "Unknown error");
    return new NextResponse(null, { status: 503, headers: { "Retry-After": "5", "Cache-Control": "private, no-store" } });
  } finally { release?.(false); }
}
