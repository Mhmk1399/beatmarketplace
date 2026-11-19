import { NextResponse } from "next/server";
import { z } from "zod";

import { marketplaceError, MarketplaceError, requireMarketplaceRole } from "@/lib/marketplace/server";
import { getTaxonomyModel, serializeTaxonomy } from "@/lib/marketplace/taxonomy";
import { objectIdSchema } from "@/lib/marketplace/validation";
import { saveTaxonomy } from "@/lib/marketplace/taxonomy-server";
import { taxonomyKindSchema } from "@/lib/marketplace/validation";
import { readJson, requireOrigin } from "@/lib/workspace/server";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return saveTaxonomy(request, (await context.params).id);
}
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireOrigin(request);
    const auth = await requireMarketplaceRole(request, "ADMIN");
    if (!auth.ok) return auth.response;
    const id = objectIdSchema.parse((await context.params).id);
    const data = z.object({ kind: taxonomyKindSchema, expectedVersion: z.number().int().min(0).optional() }).strict()
      .refine(value => value.expectedVersion !== undefined, { message: "Refresh this classification before deactivating it." }).parse(await readJson(request));
    const model = getTaxonomyModel(data.kind), existing = await model.findById(id);
    if (!existing) throw new MarketplaceError("Classification not found.", 404);
    if (data.expectedVersion !== undefined && data.expectedVersion !== (existing.__v ?? 0)) throw new MarketplaceError("This category changed. Refresh and try again.", 409);
    const item = await model.findOneAndUpdate({ _id: id, __v: existing.__v ?? 0 }, { $set: { isActive: false }, $inc: { __v: 1 } }, { returnDocument: "after", runValidators: true });
    if (!item) throw new MarketplaceError("This category changed. Refresh and try again.", 409);
    return NextResponse.json({ item: serializeTaxonomy(item, data.kind) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return marketplaceError(error); }
}
