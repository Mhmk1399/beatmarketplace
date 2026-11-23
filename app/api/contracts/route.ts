import { readSecureJson } from "@/lib/security/request";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";

import { connectToDatabase } from "@/lib/db";
import { activeContractFilter, marketplaceError, MarketplaceError, producerIsPublic, publicTrackFilter, requireMarketplaceRole, serializeLicense, serializeStudioLicense } from "@/lib/marketplace/server";
import { contractInputSchema, objectIdSchema } from "@/lib/marketplace/validation";
import ContractModel from "@/models/Contract";
import TrackModel from "@/models/Track";
import TrackDiscountModel from "@/models/TrackDiscount";
import { activeDiscountFilter, serializeDiscount } from "@/lib/marketplace/discount-server";
import { cursorFilter, escapeRegex, resourcePage } from "@/lib/workspace/server";

const publicPageSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(24).default(12),
});

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    if (query.get("mine") === "1") {
      const authentication = await requireMarketplaceRole(request, "PRODUCER");
      if (!authentication.ok) return authentication.response;
      if (query.has("limit")) { const values = z.object({ limit: z.coerce.number().int().min(1).max(50), q: z.string().trim().max(160).default(""), cursor: z.string().max(256).optional() }).parse(Object.fromEntries(query)); const records = await ContractModel.find({ producerId: authentication.user._id, ...(values.q ? { title: { $regex: escapeRegex(values.q), $options: "i" } } : {}), ...cursorFilter(values.cursor) }).sort({ createdAt: -1, _id: -1 }).limit(values.limit + 1); const result = resourcePage(records, values.limit); return NextResponse.json({ items: result.page.map(serializeStudioLicense), hasMore: result.hasMore, nextCursor: result.nextCursor }, { headers: { "Cache-Control": "private, no-store" } }); }
      const contracts = await ContractModel.find({ producerId: authentication.user._id }).sort({ createdAt: -1 }).limit(500);
      return NextResponse.json({ contracts: contracts.map(serializeStudioLicense) }, { headers: { "Cache-Control": "no-store" } });
    }
    const trackId = objectIdSchema.parse(query.get("trackId"));
    const pagination = publicPageSchema.parse(Object.fromEntries(query));
    await connectToDatabase();
    const track = await TrackModel.findOne({ _id: trackId, ...publicTrackFilter });
    if (!track || !await producerIsPublic(track.producerId)) throw new MarketplaceError("This track is unavailable.", 404);
    const now = new Date();
    const [contracts, promotion] = await Promise.all([
      ContractModel.find({ ...activeContractFilter(now), trackIds: track._id, producerId: track.producerId })
        .select("title description price currency filesToDeliver version terms territory")
        .sort({ price: 1, _id: 1 }).skip((pagination.page - 1) * pagination.pageSize).limit(pagination.pageSize + 1),
      TrackDiscountModel.findOne({ trackId: track._id, producerId: track.producerId, ...activeDiscountFilter(now) }),
    ]);
    const discount = promotion ? serializeDiscount(promotion) : null;
    return NextResponse.json({ contracts: contracts.slice(0, pagination.pageSize).map((contract) => serializeLicense(contract, discount, now)),
      hasMore: contracts.length > pagination.pageSize, ...pagination, serverTime: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return marketplaceError(error); }
}

export async function POST(request: Request) {
  try {
    const authentication = await requireMarketplaceRole(request, "PRODUCER");
    if (!authentication.ok) return authentication.response;
    const data = contractInputSchema.parse(await readSecureJson(request, 131072));
    const ownedCount = await TrackModel.countDocuments({ _id: { $in: data.trackIds }, producerId: authentication.user._id, status: { $ne: "ARCHIVED" } });
    if (ownedCount !== data.trackIds.length) throw new MarketplaceError("Select only your own available tracks.", 403);
    const contract = await ContractModel.create({
      producerId: authentication.user._id, description: data.description, territory: data.territory, title: data.title, price: mongoose.Types.Decimal128.fromString(data.price), currency: data.currency,
      trackIds: data.trackIds, filesToDeliver: data.formats.map((format) => ({ format, label: "Uncompressed WAV master", required: true })),
      terms: { licenseType: data.licenseType, streamingLimit: data.streamingLimit, distributionLimit: data.distributionLimit, musicVideoLimit: data.musicVideoLimit, commercialUse: data.commercialUse, creditRequired: data.creditRequired, creditText: data.creditText, livePerformance: data.livePerformance, broadcastRights: data.broadcastRights, contentIdAllowed: data.contentIdAllowed, termMonths: data.termMonths, royaltyPercent: data.royaltyPercent, publishingSharePercent: data.publishingSharePercent, governingLaw: data.governingLaw, customTerms: data.customTerms },
    });
    return NextResponse.json({ contract: serializeStudioLicense(contract) }, { status: 201 });
  } catch (error) { return marketplaceError(error); }
}
