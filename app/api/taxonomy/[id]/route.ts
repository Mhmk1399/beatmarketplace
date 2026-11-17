import { NextResponse } from "next/server";

import { marketplaceError, MarketplaceError, requireMarketplaceRole } from "@/lib/marketplace/server";
import { getTaxonomyModel, serializeTaxonomy } from "@/lib/marketplace/taxonomy";
import { objectIdSchema, taxonomyPatchSchema } from "@/lib/marketplace/validation";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authentication = await requireMarketplaceRole(request, "ADMIN");
    if (!authentication.ok) return authentication.response;
    const id = objectIdSchema.parse((await context.params).id);
    const { kind, ...data } = taxonomyPatchSchema.parse(await request.json());
    const item = await getTaxonomyModel(kind).findById(id);
    if (!item) throw new MarketplaceError("This classification could not be found.", 404);
    item.set(data);
    await item.save();
    return NextResponse.json({ item: serializeTaxonomy(item) });
  } catch (error) { return marketplaceError(error); }
}
