import { cache } from "react";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { decodeCatalogCursor, encodeCatalogCursor } from "@/lib/marketplace/pagination";
import { escapeSearch, publicTrackFilter, serializeTracks } from "@/lib/marketplace/server";
import { WorkspaceError } from "@/lib/workspace/server";
import UserModel, { type UserDocument } from "@/models/User";
import ProducerProfileModel, { type ProducerProfileDocument } from "@/models/ProducerProfile";
import TrackModel from "@/models/Track";
import GenreModel from "@/models/Genre";
import { PRODUCER_SOCIALS, type ProducerDirectoryPage, type ProducerSettings, type ProducerSummary } from "./types";
import { producerBeatsSchema, producerDirectorySchema } from "./validation";

export const producerImageUrl = (id: string, slot: "avatar" | "banner", key?: string) => key ? `/api/producers/${id}/images/${slot}?v=${encodeURIComponent(key)}` : null;
export const producerHref = (user: Pick<UserDocument, "id" | "profile">) => `/producers/${user.profile?.username && !/^[a-f\d]{24}$/i.test(user.profile.username) ? user.profile.username : user.id}`;
const nameOf = (user: Pick<UserDocument, "firstName" | "lastName" | "profile">) => (user.profile?.displayName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Independent producer").slice(0, 120);
export function producerSettingsDto(profile: ProducerProfileDocument | null, user: UserDocument, options: { privateMedia?: boolean } = {}): ProducerSettings {
  const imageUrl = (slot: "avatar" | "banner", key?: string) => {
    const url = producerImageUrl(user.id, slot, key);
    return options.privateMedia && url ? `${url}&private=1` : url;
  };
  return { producerId: user.id, stageName: profile?.stageName || nameOf(user), storefrontName: profile?.storefrontName || `${nameOf(user)} Studio`.slice(0, 120),
    bio: profile?.bio || "", tagline: profile?.tagline || "", location: profile?.location || "", website: profile?.website || "",
    socialLinks: Object.fromEntries(PRODUCER_SOCIALS.map(name => [name, profile?.socialLinks?.[name] || ""])) as ProducerSettings["socialLinks"],
    genreIds: (profile?.genreIds || []).map(String), featuredTrackIds: (profile?.featuredTrackIds || []).map(String),
    bannerPosition: profile?.bannerPosition || "center", layout: profile?.layout || "IMMERSIVE", version: profile?.__v ?? 0,
    bannerUrl: imageUrl("banner", profile?.banner?.key), avatarUrl: imageUrl("avatar", user.profile?.avatar?.key), publicUrl: producerHref(user) };
}
function cursorMatch(value?: string) {
  if (!value) return {};
  try { const cursor = decodeCatalogCursor(value); return { $or: [{ createdAt: { $lt: new Date(cursor.createdAt) } }, { createdAt: new Date(cursor.createdAt), _id: { $lt: new mongoose.Types.ObjectId(cursor.id) } }] }; }
  catch { throw new WorkspaceError("Invalid page cursor."); }
}
async function summaries(users: UserDocument[], suppliedProfiles?: ProducerProfileDocument[]): Promise<ProducerSummary[]> {
  if (!users.length) return [];
  const ids = users.map(user => user._id);
  const [profiles, counts] = await Promise.all([
    suppliedProfiles ?? ProducerProfileModel.find({ userId: { $in: ids } }),
    TrackModel.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([{ $match: { producerId: { $in: ids }, ...publicTrackFilter } }, { $group: { _id: "$producerId", count: { $sum: 1 } } }]),
  ]);
  const genres = await GenreModel.find({ _id: { $in: profiles.flatMap(profile => profile.genreIds) }, isActive: true }).select("name slug").lean();
  const byUser = new Map(profiles.map(profile => [String(profile.userId), profile])), byGenre = new Map(genres.map(genre => [String(genre._id), { id: String(genre._id), name: genre.name, slug: genre.slug }]));
  const byCount = new Map(counts.map(row => [String(row._id), row.count]));
  return users.map(user => {
    const profile = byUser.get(user.id), settings = producerSettingsDto(profile ?? null, user);
    return { id: user.id, href: settings.publicUrl, username: user.profile?.username || "", stageName: settings.stageName,
      storefrontName: settings.storefrontName, tagline: settings.tagline, bio: settings.bio, location: settings.location,
      website: settings.website, socialLinks: settings.socialLinks, avatarUrl: settings.avatarUrl, bannerUrl: settings.bannerUrl,
      bannerPosition: settings.bannerPosition, layout: settings.layout, genres: settings.genreIds.flatMap(id => byGenre.has(id) ? [byGenre.get(id)!] : []),
      beatCount: byCount.get(user.id) || 0, memberSince: user.createdAt.toISOString() };
  });
}
export async function getProducerDirectory(input: { q?: string; cursor?: string; limit?: number | string }): Promise<ProducerDirectoryPage> {
  const query = producerDirectorySchema.parse(input); await connectToDatabase();
  const pipeline: mongoose.PipelineStage[] = [{ $match: { roles: "PRODUCER", status: "ACTIVE", ...cursorMatch(query.cursor) } }, { $sort: { createdAt: -1, _id: -1 } }];
  if (query.q) {
    const expression = { $regex: escapeSearch(query.q), $options: "i" };
    pipeline.push({ $lookup: { from: ProducerProfileModel.collection.name, localField: "_id", foreignField: "userId", as: "__studio" } },
      { $match: { $or: [{ "__studio.stageName": expression }, { "__studio.storefrontName": expression }, { "profile.username": expression }, { "profile.displayName": expression }, { firstName: expression }, { lastName: expression }] } });
  }
  pipeline.push({ $limit: query.limit + 1 }, { $project: { _id: 1, createdAt: 1 } });
  const candidates = await UserModel.aggregate<{ _id: mongoose.Types.ObjectId; createdAt: Date }>(pipeline).option({ maxTimeMS: 5000 });
  const page = candidates.slice(0, query.limit), users = await UserModel.find({ _id: { $in: page.map(row => row._id) }, roles: "PRODUCER", status: "ACTIVE" }).select("firstName lastName profile createdAt");
  const order = new Map(page.map((row, index) => [String(row._id), index])); users.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  const last = page.at(-1), hasMore = candidates.length > query.limit;
  return { items: await summaries(users), hasMore, nextCursor: hasMore && last ? encodeCatalogCursor({ id: String(last._id), createdAt: last.createdAt.toISOString() }) : null };
}
export const resolvePublicProducer = cache(async (identifier: string) => {
  if (!/^(?:[a-f\d]{24}|[a-z0-9_]{3,40})$/i.test(identifier)) return null;
  await connectToDatabase();
  const identity = /^[a-f\d]{24}$/i.test(identifier) ? { _id: identifier } : { "profile.username": identifier.toLowerCase() };
  return UserModel.findOne({ ...identity, roles: "PRODUCER", status: "ACTIVE" }).select("firstName lastName profile createdAt");
});
export async function getPublicProducerBeats(userId: string, input: { q?: string; cursor?: string; limit?: number | string } = {}) {
  const query = producerBeatsSchema.parse(input);
  const records = await TrackModel.find({ producerId: new mongoose.Types.ObjectId(userId), ...publicTrackFilter, ...cursorMatch(query.cursor), ...(query.q ? { title: { $regex: escapeSearch(query.q), $options: "i" } } : {}) }).sort({ createdAt: -1, _id: -1 }).limit(query.limit + 1);
  const page = records.slice(0, query.limit), last = page.at(-1), hasMore = records.length > query.limit;
  return { tracks: await serializeTracks(page), hasMore, nextCursor: hasMore && last ? encodeCatalogCursor({ id: last.id, createdAt: last.createdAt.toISOString() }) : null, serverTime: new Date().toISOString() };
}
export const getPublicProducerPage = cache(async (identifier: string) => {
  const user = await resolvePublicProducer(identifier); if (!user) return null;
  const profile = await ProducerProfileModel.findOne({ userId: user._id });
  const [items, catalog, selected] = await Promise.all([
    summaries([user], profile ? [profile] : []), getPublicProducerBeats(user.id),
    TrackModel.find({ _id: { $in: profile?.featuredTrackIds || [] }, producerId: user._id, ...publicTrackFilter }).limit(6),
  ]);
  const featured = await serializeTracks(selected), byId = new Map(featured.map(track => [track.id, track]));
  return { producer: items[0], catalog, featured: (profile?.featuredTrackIds || []).flatMap(id => byId.has(String(id)) ? [byId.get(String(id))!] : []) };
});
