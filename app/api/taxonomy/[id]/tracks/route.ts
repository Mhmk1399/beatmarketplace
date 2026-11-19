import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { discoveryBeatPage } from "@/lib/marketplace/discovery-server";
import { getTaxonomyModel } from "@/lib/marketplace/taxonomy";
import { objectIdSchema } from "@/lib/marketplace/validation";
import { MarketplaceError, marketplaceError } from "@/lib/marketplace/server";

export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const id = objectIdSchema.parse((await context.params).id);
    const query = z.object({ kind: z.enum(["moods", "instruments"]), limit: z.coerce.number().int().min(1).max(48).default(24), cursor: z.string().min(1).max(256).optional() }).parse(Object.fromEntries(new URL(request.url).searchParams));
    await connectToDatabase();
    if (!await getTaxonomyModel(query.kind).exists({ _id: id, isActive: true })) throw new MarketplaceError("This classification is unavailable.", 404);
    return NextResponse.json(await discoveryBeatPage(query.kind, id, query.limit, query.cursor), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return marketplaceError(error); }
}
