import type { HydratedDocument, Model } from "mongoose";

import type { TaxonomyItem, TaxonomyKind } from "@/lib/marketplace/types";
import type { ObjectStorageAsset } from "@/models/schemas/shared";
import GenreModel from "@/models/Genre";
import InstrumentModel from "@/models/Instrument";
import MoodModel from "@/models/Mood";

export type TaxonomyFields = { name: string; slug: string; description: string; isActive: boolean; sortOrder: number; family?: string; color?: string | null; thumbnail?: ObjectStorageAsset; banner?: ObjectStorageAsset; __v?: number; createdAt: Date };

// All three schemas share these fields; only creation of instruments supplies a family default.
const models = {
  genres: GenreModel,
  moods: MoodModel,
  instruments: InstrumentModel,
} as unknown as Record<TaxonomyKind, Model<TaxonomyFields>>;

export function getTaxonomyModel(kind: TaxonomyKind) { return models[kind]; }
export function categoryImageUrl(id: string, slot: "thumbnail" | "banner", asset?: ObjectStorageAsset, kind: TaxonomyKind = "genres") {
  return asset ? `/api/taxonomy/${id}/images/${slot}?${kind === "genres" ? "" : `kind=${kind}&`}v=${encodeURIComponent(asset.key)}` : null;
}
export function serializeTaxonomy(item: Pick<HydratedDocument<TaxonomyFields>, "_id"> & TaxonomyFields, kind: TaxonomyKind = "genres"): TaxonomyItem {
  const id = String(item._id);
  return { id, name: item.name, slug: item.slug, description: item.description ?? "", sortOrder: item.sortOrder ?? 0, isActive: item.isActive, version: item.__v ?? 0,
    thumbnailUrl: categoryImageUrl(id, "thumbnail", item.thumbnail, kind), bannerUrl: categoryImageUrl(id, "banner", item.banner, kind),
    ...(kind === "instruments" ? { family: item.family ?? "OTHER" } : {}), ...(kind === "moods" ? { color: item.color ?? null } : {}) };
}
