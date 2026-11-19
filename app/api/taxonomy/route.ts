import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { marketplaceError, requireMarketplaceRole } from "@/lib/marketplace/server";
import { taxonomyKindSchema } from "@/lib/marketplace/validation";
import { getTaxonomyModel, serializeTaxonomy } from "@/lib/marketplace/taxonomy";
import { cursorFilter, escapeRegex, resourcePage } from "@/lib/workspace/server";
import { saveTaxonomy } from "@/lib/marketplace/taxonomy-server";
import { z } from "zod";
import { publicTaxonomyPage } from "@/lib/marketplace/taxonomy-list";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    const kind = taxonomyKindSchema.parse(query.get("kind") ?? "genres");
    const admin = query.get("mine") === "1";
    if (admin) {
      const authentication = await requireMarketplaceRole(request, "ADMIN");
      if (!authentication.ok) return authentication.response;
    }
    if (!admin && query.has("limit")) {
      const values = z.object({ limit: z.coerce.number().int().min(1).max(48), cursor: z.string().min(1).max(1024).optional() }).parse(Object.fromEntries(query));
      return NextResponse.json(await publicTaxonomyPage(kind, values.limit, values.cursor), { headers: { "Cache-Control": "no-store" } });
    }
    await connectToDatabase();
    if (admin && query.has("limit")) {
      const values = z.object({ limit: z.coerce.number().int().min(1).max(50), q: z.string().trim().max(160).default(""), cursor: z.string().max(256).optional() }).parse(Object.fromEntries(query));
      const items = await getTaxonomyModel(kind).find({ ...(values.q ? { name: { $regex: escapeRegex(values.q), $options: "i" } } : {}), ...cursorFilter(values.cursor) }).sort({ createdAt: -1, _id: -1 }).limit(values.limit + 1).lean();
      const result = resourcePage(items, values.limit);
      return NextResponse.json({ items: result.page.map(item => serializeTaxonomy(item, kind)), hasMore: result.hasMore, nextCursor: result.nextCursor }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const items = await getTaxonomyModel(kind).find(admin ? {} : { isActive: true }).sort({ sortOrder: 1, name: 1, _id: 1 }).limit(500).lean();
    return NextResponse.json({ items: items.map(item => serializeTaxonomy(item, kind)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return marketplaceError(error); }
}

export async function POST(request: Request) {
  return saveTaxonomy(request);
}
