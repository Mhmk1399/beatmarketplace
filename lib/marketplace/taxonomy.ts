import type { HydratedDocument, Model } from "mongoose";

import type { TaxonomyItem, TaxonomyKind } from "@/lib/marketplace/types";
import GenreModel from "@/models/Genre";
import InstrumentModel from "@/models/Instrument";
import MoodModel from "@/models/Mood";

type TaxonomyFields = { name: string; slug: string; isActive: boolean; sortOrder: number; family?: string };

// All three schemas share these fields; only creation of instruments supplies a family default.
const models = {
  genres: GenreModel,
  moods: MoodModel,
  instruments: InstrumentModel,
} as unknown as Record<TaxonomyKind, Model<TaxonomyFields>>;

export function getTaxonomyModel(kind: TaxonomyKind) { return models[kind]; }
export function serializeTaxonomy(item: HydratedDocument<TaxonomyFields>): TaxonomyItem {
  return { id: String(item._id), name: item.name, slug: item.slug, isActive: item.isActive };
}
