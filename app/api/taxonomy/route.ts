import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { marketplaceError, requireMarketplaceRole } from "@/lib/marketplace/server";
import { taxonomyInputSchema, taxonomyKindSchema } from "@/lib/marketplace/validation";
import { getTaxonomyModel, serializeTaxonomy } from "@/lib/marketplace/taxonomy";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    const kind = taxonomyKindSchema.parse(query.get("kind") ?? "genres");
    const admin = query.get("mine") === "1";
    if (admin) {
      const authentication = await requireMarketplaceRole(request, "ADMIN");
      if (!authentication.ok) return authentication.response;
    }
    await connectToDatabase();
    const items = await getTaxonomyModel(kind).find(admin ? {} : { isActive: true }).sort({ sortOrder: 1, name: 1 }).limit(500);
    return NextResponse.json({ items: items.map(serializeTaxonomy) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return marketplaceError(error); }
}

export async function POST(request: Request) {
  try {
    const authentication = await requireMarketplaceRole(request, "ADMIN");
    if (!authentication.ok) return authentication.response;
    const data = taxonomyInputSchema.parse(await request.json());
    const model = getTaxonomyModel(data.kind);
    const item = await model.create({ name: data.name, slug: data.slug, isActive: data.isActive, ...(data.kind === "instruments" ? { family: "OTHER" } : {}) });
    return NextResponse.json({ item: serializeTaxonomy(item) }, { status: 201 });
  } catch (error) { return marketplaceError(error); }
}
