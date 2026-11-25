import { licenseConditions } from "@/lib/licensing/conditions";
import { licenseTermsHash } from "@/lib/licensing/server";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { authenticateRequest } from "@/lib/auth";
import type { MarketplaceLicense, MarketplaceTrack, StudioLicense, TrackDiscount } from "@/lib/marketplace/types";
import { computeDiscountedPrice } from "@/lib/marketplace/discounts";
import { activeDiscountFilter, serializeDiscount } from "@/lib/marketplace/discount-server";
import { validationError } from "@/lib/validation";
import ContractModel, { type ContractDocument } from "@/models/Contract";
import GenreModel from "@/models/Genre";
import MoodModel from "@/models/Mood";
import InstrumentModel from "@/models/Instrument";
import ProducerProfileModel from "@/models/ProducerProfile";
import TrackModel, { type TrackFields } from "@/models/Track";
import UserModel from "@/models/User";
import TrackDiscountModel from "@/models/TrackDiscount";
import { parseBoundedTrackForm } from "@/lib/media/upload";
import { previewUrl, artworkUrl } from "@/lib/media/policy";
import { securityErrorResponse } from "@/lib/security/request";
import { consumeApiQuota } from "@/lib/security/rate-limit";

export class MarketplaceError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function requireMarketplaceRole(request: Request, role: "PRODUCER" | "ADMIN") {
  const authentication = await authenticateRequest(request);
  if (!authentication.ok) return authentication;
  // Keep Studio restricted to an actual producer role, like its server layout.
  if (!authentication.user.roles.includes(role)) {
    return { ok: false as const, response: NextResponse.json({ error: `${role === "ADMIN" ? "Admin" : "Producer"} access required.` }, { status: 403 }) };
  }
  if (["POST", "PATCH"].includes(request.method) && new URL(request.url).pathname.startsWith("/api/tracks")) {
    await consumeApiQuota("track-upload", authentication.user.id, 20, 3600_000);
  }
  return authentication;
}

export function marketplaceError(error: unknown) {
  const secured = securityErrorResponse(error);
  if (secured) return secured;
  if (error instanceof ZodError) return NextResponse.json(validationError(error), { status: 400 });
  if (error instanceof mongoose.Error.VersionError) return NextResponse.json({ error: "This record changed while you were editing. Refresh and try again." }, { status: 409 });
  if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON request data." }, { status: 400 });
  if (error instanceof mongoose.Error.ValidationError) {
    return NextResponse.json({ error: "Please review the highlighted information.", issues: Object.entries(error.errors).map(([field, value]) => ({ field, message: value.message })) }, { status: 400 });
  }
  if (typeof error === "object" && error && "code" in error && error.code === 11000) {
    return NextResponse.json({ error: "A record with this value already exists." }, { status: 409 });
  }
  if (error instanceof MarketplaceError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && "status" in error && typeof error.status === "number" && [400, 403, 408, 413, 415, 422, 429, 503].includes(error.status)) {
    return NextResponse.json({ error: error.message }, { status: error.status, ...(error.status === 429 ? { headers: { "Retry-After": "10" } } : {}) });
  }
  console.error("Marketplace request failed", error instanceof Error ? error.name : "Unknown error");
  return NextResponse.json({ error: "The service is temporarily unavailable. Please try again shortly." }, { status: 503 });
}

export const publicTrackFilter = { status: "PUBLISHED", visibility: "PUBLIC" } as const;

export function activeContractFilter(now = new Date()) {
  return { isActive: true, currency: "IRT", effectiveFrom: { $lte: now }, $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] };
}

export async function producerIsPublic(producerId: mongoose.Types.ObjectId | string) {
  return Boolean(await UserModel.exists({ _id: producerId, status: "ACTIVE", roles: "PRODUCER" }));
}

type LicenseRecord = Pick<ContractDocument, "_id" | "title" | "price" | "currency" | "terms" | "filesToDeliver" | "version" | "description" | "territory">;
export const MAX_PUBLIC_LICENSES_PER_TRACK = 12;

export function serializeLicense(contract: LicenseRecord, discount: TrackDiscount | null = null, now = new Date()): MarketplaceLicense {
  const originalPrice = contract.price.toString();
  return {
    description: contract.description ?? "", conditions: licenseConditions(contract.terms, contract.territory), termsHash: licenseTermsHash(contract),
    id: String(contract._id), title: contract.title, price: discount ? String(computeDiscountedPrice(originalPrice, discount, now)) : originalPrice,
    originalPrice, discount, currency: contract.currency,
    licenseType: contract.terms.licenseType, formats: contract.filesToDeliver.map((file) => file.format),
    streamingLimit: contract.terms.streamingLimit, distributionLimit: contract.terms.distributionLimit,
    customTerms: contract.terms.customTerms ?? "", version: contract.version,
  };
}

export function serializeStudioLicense(contract: ContractDocument): StudioLicense {
  return { ...serializeLicense(contract), trackIds: contract.trackIds.map(String), isActive: contract.isActive };
}

/** Explicit allowlist: full masters, storage buckets/keys, collaborators, and user records never escape. */
export async function serializeTracks(tracks: (TrackFields & { _id: mongoose.Types.ObjectId; __v?: number })[], now = new Date(), options: { includeLicenseTerms?: boolean; includeTaxonomy?: boolean } = {}): Promise<MarketplaceTrack[]> {
  if (!tracks.length) return [];
  const trackIds = tracks.map((track) => track._id);
  const producerIds = [...new Set(tracks.map((track) => String(track.producerId)))];
  const genreIds = tracks.flatMap((track) => track.metadata.genreId ? [track.metadata.genreId] : []);
  const [licenseGroups, profiles, producers, genres, discounts, moods, instruments] = await Promise.all([
    TrackModel.aggregate<{ _id: mongoose.Types.ObjectId; licenses: LicenseRecord[]; purchasableLicenses: { _id: mongoose.Types.ObjectId }[] }>([
      { $match: { _id: { $in: trackIds } } },
      { $lookup: { from: ContractModel.collection.name, localField: "_id", foreignField: "trackIds", let: { producer: "$producerId" }, pipeline: [
        { $match: { ...activeContractFilter(now), $expr: { $eq: ["$producerId", "$$producer"] } } },
        { $sort: { price: 1, _id: 1 } },
        { $limit: MAX_PUBLIC_LICENSES_PER_TRACK + 1 },
        { $project: { _id: 1, title: 1, description: 1, territory: 1, price: 1, currency: 1, filesToDeliver: 1, version: 1,
          "terms.licenseType": 1, "terms.streamingLimit": 1, "terms.distributionLimit": 1, "terms.musicVideoLimit": 1, "terms.commercialUse": 1, "terms.creditRequired": 1, "terms.creditText": 1, "terms.livePerformance": 1, "terms.broadcastRights": 1, "terms.contentIdAllowed": 1, "terms.termMonths": 1, "terms.royaltyPercent": 1, "terms.publishingSharePercent": 1, "terms.governingLaw": 1,
          ...(options.includeLicenseTerms ? { "terms.customTerms": 1 } : {}),
        } },
      ], as: "licenses" } },
      { $lookup: { from: ContractModel.collection.name, localField: "_id", foreignField: "trackIds", let: { producer: "$producerId" }, pipeline: [
        { $match: { ...activeContractFilter(now), "terms.licenseType": "NON_EXCLUSIVE", "filesToDeliver.format": "WAV", $expr: { $eq: ["$producerId", "$$producer"] } } },
        { $limit: 1 }, { $project: { _id: 1 } },
      ], as: "purchasableLicenses" } },
      { $project: { _id: 1, licenses: 1, purchasableLicenses: 1 } },
    ]).option({ maxTimeMS: 10_000 }),
    ProducerProfileModel.find({ userId: { $in: producerIds } }).select("userId stageName").lean(),
    UserModel.find({ _id: { $in: producerIds } }).select("firstName lastName profile.displayName profile.avatar.key").lean(),
    GenreModel.find({ _id: { $in: genreIds } }).select("name").lean(),
    TrackDiscountModel.find({ ...activeDiscountFilter(now), trackId: { $in: trackIds } }),
    options.includeTaxonomy ? MoodModel.find({ _id: { $in: tracks.flatMap(track => track.metadata.moodIds ?? []) }, isActive: true }).select("name slug").lean() : [],
    options.includeTaxonomy ? InstrumentModel.find({ _id: { $in: tracks.flatMap(track => track.metadata.instrumentIds ?? []) }, isActive: true }).select("name slug").lean() : [],
  ]);
  const profileNames = new Map(profiles.map((profile) => [String(profile.userId), profile.stageName]));
  const producerNames = new Map(producers.map((producer) => [String(producer._id), producer.profile.displayName || `${producer.firstName} ${producer.lastName}`]));
  const producerAvatars = new Map(producers.map(producer => [String(producer._id), producer.profile.avatar?.key ? `/api/producers/${producer._id}/images/avatar?v=${encodeURIComponent(producer.profile.avatar.key)}` : null]));
  const genreNames = new Map(genres.map((genre) => [String(genre._id), genre.name]));
  const discountByTrack = new Map(discounts.map((discount) => [String(discount.trackId), discount]));
  const licensesByTrack = new Map(licenseGroups.map((row) => [String(row._id), row.licenses]));
  const purchasableByTrack = new Map(licenseGroups.map((row) => [String(row._id), row.purchasableLicenses.length > 0]));
  const moodTags = new Map(moods.map(item => [String(item._id), { id: String(item._id), name: item.name, slug: item.slug }]));
  const instrumentTags = new Map(instruments.map(item => [String(item._id), { id: String(item._id), name: item.name, slug: item.slug }]));
  return tracks.map((track) => {
    const producerId = String(track.producerId);
    const genreId = track.metadata.genreId ? String(track.metadata.genreId) : null;
    const candidate = discountByTrack.get(String(track._id));
    const discount = candidate && String(candidate.producerId) === producerId ? serializeDiscount(candidate) : null;
    return {
      id: String(track._id), title: track.title, slug: track.slug, description: track.description, version: track.__v ?? 0,
      producerId, producerName: profileNames.get(producerId) || producerNames.get(producerId) || "Producer",
      producerAvatarUrl: producerAvatars.get(producerId) || null,
      artworkUrl: artworkUrl(track.artwork), previewUrl: previewUrl(track.audio.preview),
      previewStartSeconds: track.audio.previewStartSeconds ?? 0, previewDurationSeconds: track.audio.previewDurationSeconds ?? 30,
      durationSeconds: track.metadata.durationSeconds ?? 0, bpm: track.metadata.bpm, musicalKey: track.metadata.musicalKey,
      genre: genreId && genreNames.has(genreId) ? { id: genreId, name: genreNames.get(genreId)! } : null,
      moodIds: (track.metadata.moodIds ?? []).map(String), instrumentIds: (track.metadata.instrumentIds ?? []).map(String),
      ...(options.includeTaxonomy ? {
        moods: (track.metadata.moodIds ?? []).flatMap(id => moodTags.get(String(id)) ?? []),
        instruments: (track.metadata.instrumentIds ?? []).flatMap(id => instrumentTags.get(String(id)) ?? []),
      } : {}),
      tags: [...track.metadata.tags], explicit: track.metadata.isExplicit ?? false, status: track.status, visibility: track.visibility,
      licenses: (licensesByTrack.get(String(track._id)) ?? []).slice(0, MAX_PUBLIC_LICENSES_PER_TRACK).map((contract) => serializeLicense(contract, discount, now)),
      hasPurchasableLicense: purchasableByTrack.get(String(track._id)) ?? false,
      hasMoreLicenses: (licensesByTrack.get(String(track._id))?.length ?? 0) > MAX_PUBLIC_LICENSES_PER_TRACK,
      discount,
    };
  });
}

export async function parseTrackForm(request: Request) {
  return parseBoundedTrackForm(request);
}

export function escapeSearch(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
export async function validateTrackChoices(data: { moodIds?: string[]; instrumentIds?: string[] }) { for (const [collection, ids, label] of [["moods",data.moodIds,"moods"],["instruments",data.instrumentIds,"instruments"]] as const) { if (ids?.length && await mongoose.connection.db!.collection(collection).countDocuments({ _id: { $in: ids.map(id => new mongoose.Types.ObjectId(id)) }, isActive: true }) !== ids.length) throw new MarketplaceError(`Select only active ${label}.`); } }
