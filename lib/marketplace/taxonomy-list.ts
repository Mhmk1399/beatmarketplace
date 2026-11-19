import mongoose from "mongoose";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { getTaxonomyModel, serializeTaxonomy } from "./taxonomy";
import type { TaxonomyKind } from "./types";
import type { TaxonomyListPage } from "./discovery";
import { objectIdSchema, taxonomyKindSchema } from "./validation";
import { MarketplaceError } from "./server";

const cursorSchema = z.object({ kind: taxonomyKindSchema, order: z.number().int().min(0), name: z.string().max(100), id: objectIdSchema }).strict();
export async function publicTaxonomyPage(kind: TaxonomyKind, limit = 24, cursor?: string): Promise<TaxonomyListPage> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 48) throw new MarketplaceError("Choose a page size from 1 to 48.");
  let boundary = {};
  if (cursor) {
    try {
      if (cursor.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw Error();
      const value = cursorSchema.parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")));
      if (value.kind !== kind) throw Error();
      boundary = { $or: [{ sortOrder: { $gt: value.order } }, { sortOrder: value.order, name: { $gt: value.name } }, { sortOrder: value.order, name: value.name, _id: { $gt: new mongoose.Types.ObjectId(value.id) } }] };
    } catch { throw new MarketplaceError("Invalid classification cursor."); }
  }
  await connectToDatabase();
  const records = await getTaxonomyModel(kind).find({ isActive: true, ...boundary })
    .select("name slug description isActive sortOrder thumbnail banner family color createdAt __v")
    .sort({ sortOrder: 1, name: 1, _id: 1 }).limit(limit + 1).lean();
  const page = records.slice(0, limit), last = page.at(-1), hasMore = records.length > limit;
  return { items: page.map(item => serializeTaxonomy(item, kind)), hasMore,
    nextCursor: hasMore && last ? Buffer.from(JSON.stringify({ kind, order: last.sortOrder ?? 0, name: last.name, id: String(last._id) })).toString("base64url") : null };
}
