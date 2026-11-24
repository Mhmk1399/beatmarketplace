import { consumeApiQuota } from "@/lib/security/rate-limit";
import { trackUploadResponse } from "@/lib/uploads/server-progress";
import { trackUploadIdentity } from "@/lib/uploads/identity";
import type { UploadStageReporter } from "@/lib/uploads/protocol";
import { validateTrackChoices } from "@/lib/marketplace/server";
import { saveTrackWithSlug } from "@/lib/marketplace/track-slug-server";
import { trackSlugBase } from "@/lib/marketplace/track-url";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { activeContractFilter, escapeSearch, marketplaceError, MarketplaceError, parseTrackForm, publicTrackFilter, requireMarketplaceRole, serializeTracks } from "@/lib/marketplace/server";
import { trackInputSchema, trackQuerySchema } from "@/lib/marketplace/validation";
import { removeStoredAssets, storeTrackMedia } from "@/lib/media/storage";
import { acquireMediaUploadLease } from "@/lib/media/upload";
import { activeDiscountFilter } from "@/lib/marketplace/discount-server";
import ContractModel from "@/models/Contract";
import GenreModel from "@/models/Genre";
import TrackModel from "@/models/Track";
import UserModel from "@/models/User";
import ProducerProfileModel from "@/models/ProducerProfile";
import TrackDiscountModel from "@/models/TrackDiscount";
import { decodeCatalogCursor, encodeCatalogCursor } from "@/lib/marketplace/pagination";
import { genreAliases } from "@/lib/marketplace/genres";
import { musicalKeySearchPattern } from "@/lib/music/keys";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await consumeApiQuota("public-catalog", "all", 1200, 60_000);
    const params = new URL(request.url).searchParams;
    const now = new Date();
    const discounted = params.get("discounted") === "1";
    const query = trackQuerySchema.parse(Object.fromEntries(params));
    const cursorMode = query.pagination === "cursor";
    if (cursorMode && query.sort !== "newest") throw new MarketplaceError("Cursor pagination supports newest ordering only.");
    const mine = params.get("mine") === "1";
    const filter: Record<string, unknown> = mine ? {} : { ...publicTrackFilter };
    if (mine) {
      const authentication = await requireMarketplaceRole(request, "PRODUCER");
      if (!authentication.ok) return authentication.response;
      filter.producerId = authentication.user._id;
      if (query.status) filter.status = query.status;
      if (query.visibility) filter.visibility = query.visibility;
      if (query.trackId) filter._id = new mongoose.Types.ObjectId(query.trackId);
    }
    await connectToDatabase();
    if (query.q) {
      const expression = { $regex: escapeSearch(query.q), $options: "i" };
      const [profiles, users] = await Promise.all([
        ProducerProfileModel.find({ stageName: expression }).select("userId").limit(200),
        UserModel.find({ $or: [{ "profile.displayName": expression }, { firstName: expression }, { lastName: expression }], status: "ACTIVE", roles: "PRODUCER" }).select("_id").limit(200),
      ]);
      filter.$or = [{ title: expression }, { description: expression }, { "metadata.tags": expression }, { producerId: { $in: [...profiles.map((profile) => profile.userId), ...users.map((user) => user._id)] } }];
    }
    if (query.genreId) filter["metadata.genreId"] = new mongoose.Types.ObjectId(query.genreId);
    else if (query.genre) {
      const genres = await GenreModel.find({ isActive: true, slug: { $in: genreAliases(query.genre) } }).select("_id").lean();
      // An unknown or inactive genre matches nothing, including unassigned beats.
      filter["metadata.genreId"] = { $in: genres.map((genre) => genre._id) };
    }
    if (query.key) filter["metadata.musicalKey"] = { $regex: musicalKeySearchPattern(query.key), $options: "i" };
    if (query.moodId) filter["metadata.moodIds"] = new mongoose.Types.ObjectId(query.moodId);
    if (query.instrumentId) filter["metadata.instrumentIds"] = new mongoose.Types.ObjectId(query.instrumentId);
    if (query.minBpm !== undefined || query.maxBpm !== undefined) filter["metadata.bpm"] = {
      ...(query.minBpm !== undefined ? { $gte: query.minBpm } : {}),
      ...(query.maxBpm !== undefined ? { $lte: query.maxBpm } : {}),
    };
    if (query.cursor) {
      if (!cursorMode) throw new MarketplaceError("Select cursor pagination to use a catalog cursor.");
      let cursor;
      try { cursor = decodeCatalogCursor(query.cursor); } catch { throw new MarketplaceError("Invalid catalog cursor."); }
      filter.$and = [{ $or: [
        { createdAt: { $lt: new Date(cursor.createdAt) } },
        { createdAt: new Date(cursor.createdAt), _id: { $lt: new mongoose.Types.ObjectId(cursor.id) } },
      ] }];
    }
    const pipeline: mongoose.PipelineStage[] = [{ $match: filter }];
    if (cursorMode) pipeline.push({ $sort: { createdAt: -1, _id: -1 } });
    if (!mine) {
      pipeline.push(
        { $lookup: { from: UserModel.collection.name, let: { producer: "$producerId" }, pipeline: [
          { $match: { status: "ACTIVE", roles: "PRODUCER", $expr: { $eq: ["$_id", "$$producer"] } } }, { $project: { _id: 1 } },
        ], as: "__producer" } },
        { $match: { "__producer.0": { $exists: true } } },
      );
    }
    if (discounted || query.sort !== "newest") {
      pipeline.push({ $lookup: { from: TrackDiscountModel.collection.name, let: { track: "$_id", producer: "$producerId" }, pipeline: [
        { $match: { ...activeDiscountFilter(now), $expr: { $and: [{ $eq: ["$trackId", "$$track"] }, { $eq: ["$producerId", "$$producer"] }] } } },
        { $project: { percentage: 1, endsAt: 1 } }, { $limit: 1 },
      ], as: "__discount" } });
      if (discounted) pipeline.push({ $match: { "__discount.0": { $exists: true } } });
    }
    let sort: Record<string, 1 | -1> = { createdAt: -1, _id: -1 };
    if (discounted || query.sort !== "newest") {
      pipeline.push(
        { $lookup: { from: ContractModel.collection.name, localField: "_id", foreignField: "trackIds", let: { producer: "$producerId" }, pipeline: [
          { $match: { ...activeContractFilter(now), ...(discounted ? { "terms.licenseType": "NON_EXCLUSIVE", "filesToDeliver.format": "WAV" } : {}), $expr: { $eq: ["$producerId", "$$producer"] } } },
          { $sort: { price: 1, _id: 1 } }, { $limit: 1 },
          { $project: { price: 1 } },
        ], as: "__licenses" } },
        { $addFields: { __originalPrice: { $min: "$__licenses.price" }, __hasPrice: { $gt: [{ $size: "$__licenses" }, 0] } } },
        { $addFields: { __price: { $floor: { $add: [
          { $divide: [{ $multiply: ["$__originalPrice", { $subtract: [100, { $ifNull: [{ $first: "$__discount.percentage" }, 0] }] }] }, 100] }, 0.5,
        ] } } } },
      );
      if (discounted) pipeline.push({ $match: { __hasPrice: true } });
      if (query.sort !== "newest") sort = { __hasPrice: -1, __price: query.sort === "price-asc" ? 1 : -1, createdAt: -1, _id: -1 };
    }
    if (cursorMode) pipeline.push({ $limit: query.pageSize + 1 }, { $project: { _id: 1, createdAt: 1 } });
    else pipeline.push({ $facet: {
      metadata: [{ $count: "total" }],
      records: [{ $sort: sort }, { $skip: (query.page - 1) * query.pageSize }, { $limit: query.pageSize }, { $project: { _id: 1, createdAt: 1 } }],
    } });
    // Start deals from the indexed campaign set instead of visiting every catalog track.
    const dealsPipeline: mongoose.PipelineStage[] = discounted ? [
      { $match: activeDiscountFilter(now) },
      { $lookup: { from: TrackModel.collection.name, localField: "trackId", foreignField: "_id", as: "__track" } },
      { $unwind: "$__track" },
      { $match: { $expr: { $eq: ["$producerId", "$__track.producerId"] } } },
      { $replaceRoot: { newRoot: "$__track" } },
      ...pipeline,
    ] : [];
    const rows = await (discounted ? TrackDiscountModel.aggregate(dealsPipeline) : TrackModel.aggregate(pipeline)).allowDiskUse(true).option({ maxTimeMS: 10_000 });
    type CatalogRow = { _id: mongoose.Types.ObjectId; createdAt: Date };
    const result = cursorMode ? null : rows[0] as { metadata: { total: number }[]; records: CatalogRow[] } | undefined;
    const rawRecords = cursorMode ? rows as CatalogRow[] : result?.records ?? [];
    const hasMore = cursorMode && rawRecords.length > query.pageSize;
    const records = rawRecords.slice(0, query.pageSize);
    const documents = await TrackModel.find({ _id: { $in: records.map((record) => record._id) } });
    const documentMap = new Map(documents.map((track) => [String(track._id), track]));
    const ordered = records.flatMap((record) => documentMap.get(String(record._id)) ?? []);
    const last = records.at(-1);
    return NextResponse.json({ tracks: await serializeTracks(ordered, now), total: cursorMode ? null : result?.metadata[0]?.total ?? 0,
      hasMore: cursorMode ? hasMore : query.page * query.pageSize < (result?.metadata[0]?.total ?? 0),
      nextCursor: hasMore && last ? encodeCatalogCursor({ id: String(last._id), createdAt: new Date(last.createdAt).toISOString() }) : null,
      page: query.page, pageSize: query.pageSize, serverTime: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return marketplaceError(error); }
}

async function createProducerTrack(request: Request, producerId: mongoose.Types.ObjectId, actorId: string, report: UploadStageReporter) {
  const uploadId = trackUploadIdentity(actorId, request.headers.get("x-upload-request-id"));
  let writtenKeys: string[] = [];
  let committed = false;
  let releaseUpload: (() => void) | undefined;
  let cleanUpload: (() => Promise<void>) | undefined;
  try {
    if (uploadId) {
      const existing = await TrackModel.findOne({ _id: uploadId, producerId });
      if (existing) return NextResponse.json({ track: (await serializeTracks([existing]))[0], recovered: true });
    }
    releaseUpload = acquireMediaUploadLease();
    const form = await parseTrackForm(request);
    cleanUpload = form.cleanup;
    report("validating");
    const data = trackInputSchema.parse(form.data);
    await validateTrackChoices(data);
    if (!form.master) throw new MarketplaceError("Upload a WAV master to create your track.");
    if (data.genreId && !await GenreModel.exists({ _id: data.genreId, isActive: true })) throw new MarketplaceError("Select an active genre.");
    if (data.status === "PUBLISHED" && (!data.genreId || !form.artwork)) throw new MarketplaceError("Choose a genre and upload artwork before publishing.");
    const media = await storeTrackMedia({ master: form.master, artwork: form.artwork, previewStartSeconds: data.previewStartSeconds, onProgress: report });
    writtenKeys = [media.master?.key, media.preview?.key, media.artwork?.key].filter((key): key is string => Boolean(key));
    const track = new TrackModel({
      ...(uploadId ? { _id: new mongoose.Types.ObjectId(uploadId) } : {}), lastUploadRequestId: uploadId ?? undefined,
      producerId, title: data.title, slug: trackSlugBase(data.title), description: data.description,
      artwork: media.artwork, audio: { master: media.master, preview: media.preview, previewStartSeconds: data.previewStartSeconds, previewDurationSeconds: 30 },
      metadata: { moodIds: data.moodIds, instrumentIds: data.instrumentIds, bpm: data.bpm, musicalKey: data.musicalKey, genreId: data.genreId, tags: data.tags, durationSeconds: media.durationSeconds, isExplicit: data.explicit },
      status: data.status, visibility: data.visibility,
    });
    report("saving");
    await saveTrackWithSlug(track);
    committed = true;
    const [serialized] = await serializeTracks([track]);
    return NextResponse.json({ track: serialized }, { status: 201 });
  } catch (error) {
    if (!committed && writtenKeys.length) await removeStoredAssets(writtenKeys).catch(() => undefined);
    if (uploadId && typeof error === "object" && error && "code" in error && error.code === 11000) {
      const existing = await TrackModel.findOne({ _id: uploadId, producerId });
      if (existing) return NextResponse.json({ track: (await serializeTracks([existing]))[0], recovered: true });
    }
    return marketplaceError(error);
  } finally { try { await cleanUpload?.(); } finally { releaseUpload?.(); } }
}

export async function POST(request: Request) {
  try {
    const authentication = await requireMarketplaceRole(request, "PRODUCER");
    if (!authentication.ok) return authentication.response;
    return trackUploadResponse(request, report => createProducerTrack(request, authentication.user._id, authentication.user.id, report), marketplaceError);
  } catch (error) { return marketplaceError(error); }
}
