import { cache } from "react";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import TrackModel from "@/models/Track";
import UserModel from "@/models/User";
import { getTaxonomyModel, serializeTaxonomy } from "./taxonomy";
import { decodeCatalogCursor, encodeCatalogCursor } from "./pagination";
import { MarketplaceError, publicTrackFilter, serializeTracks } from "./server";
import type { DiscoveryBeatPage, DiscoveryKind } from "./discovery";

// React cache deduplicates metadata + page reads within one server request, not across users/requests.
export const getDiscoveryItem = cache(async (kind: DiscoveryKind, slug: string) => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) return null;
  await connectToDatabase();
  const item = await getTaxonomyModel(kind).findOne({ slug, isActive: true })
    .select("name slug description isActive sortOrder thumbnail banner family color createdAt __v").lean();
  return item ? serializeTaxonomy(item, kind) : null;
});

export async function discoveryBeatPage(kind: DiscoveryKind, id: string, limit = 24, cursor?: string): Promise<DiscoveryBeatPage> {
  if (!/^[a-f\d]{24}$/i.test(id) || !Number.isInteger(limit) || limit < 1 || limit > 48) throw new MarketplaceError("Invalid beat page.");
  const filter: Record<string, unknown> = { ...publicTrackFilter,
    [kind === "moods" ? "metadata.moodIds" : "metadata.instrumentIds"]: new mongoose.Types.ObjectId(id) };
  if (cursor) {
    let boundary;
    try { boundary = decodeCatalogCursor(cursor); } catch { throw new MarketplaceError("Invalid beat cursor."); }
    filter.$or = [{ createdAt: { $lt: new Date(boundary.createdAt) } }, { createdAt: new Date(boundary.createdAt), _id: { $lt: new mongoose.Types.ObjectId(boundary.id) } }];
  }
  await connectToDatabase();
  const rows = await TrackModel.aggregate<{ _id: mongoose.Types.ObjectId; createdAt: Date }>([
    { $match: filter }, { $sort: { createdAt: -1, _id: -1 } },
    { $lookup: { from: UserModel.collection.name, localField: "producerId", foreignField: "_id", pipeline: [
      { $match: { status: "ACTIVE", roles: "PRODUCER" } }, { $project: { _id: 1 } },
    ], as: "__producer" } },
    { $match: { "__producer.0": { $exists: true } } },
    { $limit: limit + 1 }, { $project: { _id: 1, createdAt: 1 } },
  ]).option({ maxTimeMS: 10000 });
  const page = rows.slice(0, limit), last = page.at(-1), hasMore = rows.length > limit;
  // Fetch only this page. The serializer batches related producers, licenses, genres and offers.
  const documents = await TrackModel.find({ _id: { $in: page.map(row => row._id) }, ...filter }).lean();
  const byId = new Map(documents.map(track => [String(track._id), track]));
  const now = new Date();
  return { tracks: await serializeTracks(page.flatMap(row => byId.get(String(row._id)) ?? []), now), hasMore,
    nextCursor: hasMore && last ? encodeCatalogCursor({ id: String(last._id), createdAt: last.createdAt.toISOString() }) : null,
    serverTime: now.toISOString() };
}
