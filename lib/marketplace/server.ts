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
import ProducerProfileModel from "@/models/ProducerProfile";
import TrackModel, { type TrackDocument } from "@/models/Track";
import UserModel from "@/models/User";
import TrackDiscountModel from "@/models/TrackDiscount";
import { parseBoundedTrackForm } from "@/lib/media/upload";

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
  return authentication;
}

export function marketplaceError(error: unknown) {
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
  if (error instanceof Error && "status" in error && typeof error.status === "number" && [400, 408, 413, 415, 422, 429, 503].includes(error.status)) {
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

type LicenseRecord = Pick<ContractDocument, "_id" | "title" | "price" | "currency" | "terms" | "filesToDeliver" | "version">;
export const MAX_PUBLIC_LICENSES_PER_TRACK = 12;

export function serializeLicense(contract: LicenseRecord, discount: TrackDiscount | null = null, now = new Date()): MarketplaceLicense {
  const originalPrice = contract.price.toString();
  return {
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
export async function serializeTracks(tracks: TrackDocument[], now = new Date(), options: { includeLicenseTerms?: boolean } = {}): Promise<MarketplaceTrack[]> {
  if (!tracks.length) return [];
  const trackIds = tracks.map((track) => track._id);
  const producerIds = [...new Set(tracks.map((track) => String(track.producerId)))];
  const genreIds = tracks.flatMap((track) => track.metadata.genreId ? [track.metadata.genreId] : []);
  const [licenseGroups, profiles, producers, genres, discounts] = await Promise.all([
    TrackModel.aggregate<{ _id: mongoose.Types.ObjectId; licenses: LicenseRecord[] }>([
      { $match: { _id: { $in: trackIds } } },
      { $lookup: { from: ContractModel.collection.name, localField: "_id", foreignField: "trackIds", let: { producer: "$producerId" }, pipeline: [
        { $match: { ...activeContractFilter(now), $expr: { $eq: ["$producerId", "$$producer"] } } },
        { $sort: { price: 1, _id: 1 } },
        { $limit: MAX_PUBLIC_LICENSES_PER_TRACK + 1 },
        { $project: { _id: 1, title: 1, price: 1, currency: 1, filesToDeliver: 1, version: 1,
          "terms.licenseType": 1, "terms.streamingLimit": 1, "terms.distributionLimit": 1,
          ...(options.includeLicenseTerms ? { "terms.customTerms": 1 } : {}),
        } },
      ], as: "licenses" } },
      { $project: { _id: 1, licenses: 1 } },
    ]).option({ maxTimeMS: 10_000 }),
    ProducerProfileModel.find({ userId: { $in: producerIds } }).select("userId stageName"),
    UserModel.find({ _id: { $in: producerIds } }).select("firstName lastName profile.displayName"),
    GenreModel.find({ _id: { $in: genreIds } }).select("name"),
    TrackDiscountModel.find({ ...activeDiscountFilter(now), trackId: { $in: trackIds } }),
  ]);
  const profileNames = new Map(profiles.map((profile) => [String(profile.userId), profile.stageName]));
  const producerNames = new Map(producers.map((producer) => [String(producer._id), producer.profile.displayName || `${producer.firstName} ${producer.lastName}`]));
  const genreNames = new Map(genres.map((genre) => [String(genre._id), genre.name]));
  const discountByTrack = new Map(discounts.map((discount) => [String(discount.trackId), discount]));
  const licensesByTrack = new Map(licenseGroups.map((row) => [String(row._id), row.licenses]));
  return tracks.map((track) => {
    const producerId = String(track.producerId);
    const genreId = track.metadata.genreId ? String(track.metadata.genreId) : null;
    const candidate = discountByTrack.get(String(track._id));
    const discount = candidate && String(candidate.producerId) === producerId ? serializeDiscount(candidate) : null;
    return {
      id: String(track._id), title: track.title, slug: track.slug, description: track.description,
      producerId, producerName: profileNames.get(producerId) || producerNames.get(producerId) || "Producer",
      artworkUrl: track.artwork?.publicUrl ?? null, previewUrl: track.audio.preview?.publicUrl ?? null,
      previewStartSeconds: track.audio.previewStartSeconds ?? 0, previewDurationSeconds: track.audio.previewDurationSeconds ?? 30,
      durationSeconds: track.metadata.durationSeconds ?? 0, bpm: track.metadata.bpm, musicalKey: track.metadata.musicalKey,
      genre: genreId && genreNames.has(genreId) ? { id: genreId, name: genreNames.get(genreId)! } : null,
      tags: [...track.metadata.tags], status: track.status, visibility: track.visibility,
      licenses: (licensesByTrack.get(String(track._id)) ?? []).slice(0, MAX_PUBLIC_LICENSES_PER_TRACK).map((contract) => serializeLicense(contract, discount, now)),
      hasMoreLicenses: (licensesByTrack.get(String(track._id))?.length ?? 0) > MAX_PUBLIC_LICENSES_PER_TRACK,
      discount,
    };
  });
}

export async function parseTrackForm(request: Request) {
  return parseBoundedTrackForm(request);
}

export function escapeSearch(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
