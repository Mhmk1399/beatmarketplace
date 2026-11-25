import { unstable_cache } from "next/cache";
import type mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { publicHeroPlacements } from "@/lib/hero/server";
import { publicTrackFilter, serializeTracks } from "@/lib/marketplace/server";
import { publicTaxonomyPage } from "@/lib/marketplace/taxonomy-list";
import type { TaxonomyKind } from "@/lib/marketplace/types";
import TrackModel from "@/models/Track";
import TrackMetricModel from "@/models/TrackMetric";
import UserModel from "@/models/User";

const playable = {
  ...publicTrackFilter,
  "audio.preview.durationSeconds": 30,
  "audio.preview.key": /^[0-9a-f-]{36}\.preview\.(mp3|wav)$/,
};

const activeProducer: (mongoose.PipelineStage.Lookup | mongoose.PipelineStage.Match)[] = [
  { $lookup: { from: UserModel.collection.name, localField: "producerId", foreignField: "_id", pipeline: [
    { $match: { status: "ACTIVE", roles: "PRODUCER" } }, { $project: { _id: 1 } },
  ], as: "producer" } },
  { $match: { "producer.0": { $exists: true } } },
];

export const getHomeTracks = unstable_cache(async () => {
  await connectToDatabase();
  type TrackId = { _id: mongoose.Types.ObjectId };
  const [recent, trending] = await Promise.all([
    TrackModel.aggregate<TrackId>([
      { $match: playable }, { $sort: { createdAt: -1, _id: -1 } }, ...activeProducer,
      { $limit: 8 }, { $project: { _id: 1 } },
    ]).option({ maxTimeMS: 5000 }),
    TrackMetricModel.aggregate<TrackId>([
      { $match: { views: { $gt: 0 } } }, { $sort: { views: -1, _id: 1 } }, { $limit: 32 },
      { $lookup: { from: TrackModel.collection.name, localField: "_id", foreignField: "_id", pipeline: [
        { $match: playable }, ...activeProducer, { $project: { _id: 1 } },
      ], as: "beat" } },
      { $match: { "beat.0": { $exists: true } } }, { $limit: 4 }, { $project: { _id: 1 } },
    ]).option({ maxTimeMS: 5000 }),
  ]);
  const ids = [...new Set([...recent, ...trending].map(row => String(row._id)))];
  const records = await TrackModel.find({ _id: { $in: ids }, ...playable }).lean();
  const tracks = await serializeTracks(records);
  const byId = new Map(tracks.filter(track => track.previewUrl).map(track => [track.id, track]));
  const select = (rows: TrackId[]) => rows.flatMap(({ _id }) => byId.get(String(_id)) ?? []);
  const latest = select(recent);
  const popular = select(trending);
  return { latest, trending: [...popular, ...latest.filter(track => !popular.some(item => item.id === track.id))].slice(0, 4) };
}, ["home-tracks"], { revalidate: 60 });

export const getHomeTaxonomy = unstable_cache(async (kind: TaxonomyKind) => {
  const limit = kind === "genres" ? 16 : kind === "instruments" ? 12 : 4;
  const { items } = await publicTaxonomyPage(kind, limit);
  if (kind !== "instruments") return items;

  // Prefer complete cards and give each family a slot before repeating one.
  const candidates = [...new Set([...items.filter(item => item.thumbnailUrl && item.description?.trim()), ...items])];
  const families = new Set<string>();
  const distinct = candidates.filter(item => {
    const family = item.family ?? "OTHER";
    if (families.has(family)) return false;
    families.add(family);
    return true;
  });
  const featured = new Set(distinct.map(item => item.id));
  return [...distinct, ...candidates.filter(item => !featured.has(item.id))].slice(0, 4);
}, ["home-taxonomy"], { revalidate: 60 });

export const getHomePlacements = unstable_cache(async () => {
  await connectToDatabase();
  return publicHeroPlacements();
}, ["home-placements"], { revalidate: 30 });
