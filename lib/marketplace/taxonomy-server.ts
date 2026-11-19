import { NextResponse } from "next/server";
import type { ObjectStorageAsset } from "@/models/schemas/shared";
import { removeStoredAssets } from "@/lib/media/adapter";
import { storeCategoryImage } from "@/lib/media/images";
import { acquireMediaUploadLease, parseBoundedTrackForm } from "@/lib/media/upload";
import { readJson, requireOrigin } from "@/lib/workspace/server";
import { MarketplaceError, marketplaceError, requireMarketplaceRole } from "./server";
import { getTaxonomyModel, serializeTaxonomy } from "./taxonomy";
import { objectIdSchema, taxonomyInputSchema, taxonomyPatchSchema } from "./validation";

/** Metadata and both images commit together; failed/conflicting writes remove new objects. */
export async function saveTaxonomy(request: Request, suppliedId?: string) {
  let form: Awaited<ReturnType<typeof parseBoundedTrackForm>> | undefined;
  let release: (() => void) | undefined;
  const written: ObjectStorageAsset[] = [], obsolete: ObjectStorageAsset[] = [];
  let committed = false;
  try {
    requireOrigin(request);
    const auth = await requireMarketplaceRole(request, "ADMIN");
    if (!auth.ok) return auth.response;
    const id = suppliedId ? objectIdSchema.parse(suppliedId) : undefined;
    let raw: unknown;
    if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
      release = acquireMediaUploadLease();
      form = await parseBoundedTrackForm(request, { imageFields: ["thumbnail", "banner"] });
      raw = form.data;
    } else raw = await readJson(request);
    const patch = id ? taxonomyPatchSchema.parse(raw) : null;
    const data = patch ?? taxonomyInputSchema.parse(raw);
    const model = getTaxonomyModel(data.kind);
    const existing = id ? await model.findById(id) : null;
    if (id && !existing) throw new MarketplaceError("This classification could not be found.", 404);
    if (existing && patch?.expectedVersion !== undefined && patch.expectedVersion !== (existing.__v ?? 0)) {
      throw new MarketplaceError("This category changed while you were editing. Refresh and try again.", 409);
    }
    if (data.family !== undefined && data.kind !== "instruments") throw new MarketplaceError("Only instruments have an instrument family.");
    if (data.color !== undefined && data.kind !== "moods") throw new MarketplaceError("Only moods have a mood color.");
    const fields: Record<string, unknown> = {}, unset: Record<string, string> = {};
    for (const key of ["name", "slug", "description", "sortOrder", "isActive"] as const) {
      if (data[key] !== undefined) fields[key] = data[key];
    }
    if (data.family !== undefined) fields.family = data.family;
    if (data.color !== undefined) fields.color = data.color;
    for (const slot of ["thumbnail", "banner"] as const) {
      const file = form?.[slot], remove = slot === "thumbnail" ? patch?.removeThumbnail : patch?.removeBanner;
      if (file && remove) throw new MarketplaceError(`Choose either a replacement ${slot} or removal.`);
      if (file) {
        const asset = await storeCategoryImage(file, slot);
        written.push(asset);
        fields[slot] = asset;
      } else if (remove) unset[slot] = "";
      if ((file || remove) && existing?.[slot]) obsolete.push(existing[slot]);
    }
    const item = existing
      ? await model.findOneAndUpdate({ _id: existing._id, __v: existing.__v ?? 0 }, {
        $set: fields, $inc: { __v: 1 }, ...(Object.keys(unset).length ? { $unset: unset } : {}),
      }, { returnDocument: "after", runValidators: true })
      : await model.create({ ...(data.kind === "instruments" ? { family: "OTHER" } : {}), ...fields });
    if (!item) throw new MarketplaceError("This category changed while you were editing. Refresh and try again.", 409);
    committed = true;
    await removeStoredAssets(obsolete).catch(() => console.error("Replaced category images could not be removed."));
    return NextResponse.json({ item: serializeTaxonomy(item, data.kind) }, { status: id ? 200 : 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (!committed) await removeStoredAssets(written).catch(() => console.error("Failed category upload cleanup."));
    if (typeof error === "object" && error && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "A category with this slug already exists.", issues: [{ field: "slug", message: "Choose a unique slug for this category." }] }, { status: 409 });
    }
    return marketplaceError(error);
  } finally {
    try { await form?.cleanup(); } catch { console.error("Failed category temporary-file cleanup."); }
    finally { release?.(); }
  }
}
