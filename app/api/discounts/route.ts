import { NextResponse } from "next/server";
import { discountCreateSchema, discountsQuerySchema, validateDiscountWindow } from "@/lib/marketplace/discount-validation";
import { serializeDiscount } from "@/lib/marketplace/discount-server";
import { marketplaceError, MarketplaceError, requireMarketplaceRole } from "@/lib/marketplace/server";
import TrackModel from "@/models/Track";
import TrackDiscountModel from "@/models/TrackDiscount";

export async function GET(request: Request) {
  try {
    const auth = await requireMarketplaceRole(request, "PRODUCER");
    if (!auth.ok) return auth.response;
    const query = discountsQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const filter = { producerId: auth.user._id };
    const [discounts, total] = await Promise.all([
      TrackDiscountModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip((query.page - 1) * query.pageSize).limit(query.pageSize),
      TrackDiscountModel.countDocuments(filter),
    ]);
    const tracks = await TrackModel.find({ _id: { $in: discounts.map((discount) => discount.trackId) }, producerId: auth.user._id }).select("title");
    const titles = new Map(tracks.map((track) => [String(track._id), track.title]));
    return NextResponse.json({ discounts: discounts.map((discount) => ({ ...serializeDiscount(discount), trackTitle: titles.get(String(discount.trackId)) ?? "Unavailable track" })), total, ...query, serverTime: new Date().toISOString() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return marketplaceError(error); }
}

export async function POST(request: Request) {
  try {
    const auth = await requireMarketplaceRole(request, "PRODUCER");
    if (!auth.ok) return auth.response;
    const data = discountCreateSchema.parse(await request.json());
    const dates = { startsAt: new Date(data.startsAt), endsAt: new Date(data.endsAt), isActive: true };
    const issue = validateDiscountWindow(dates);
    if (issue) throw new MarketplaceError(issue);
    const track = await TrackModel.findOne({ _id: data.trackId, producerId: auth.user._id, status: { $ne: "ARCHIVED" } }).select("title");
    if (!track) throw new MarketplaceError("Choose one of your available tracks.", 403);
    const existing = await TrackDiscountModel.findOne({ trackId: track._id });
    if (existing && String(existing.producerId) !== auth.user.id) throw new MarketplaceError("You cannot change this track's discount.", 403);
    const discount = existing ?? new TrackDiscountModel({ trackId: track._id, producerId: auth.user._id });
    discount.percentage = data.percentage;
    discount.startsAt = dates.startsAt; discount.endsAt = dates.endsAt; discount.isActive = true;
    if (existing) discount.version += 1;
    await discount.save();
    return NextResponse.json({ discount: { ...serializeDiscount(discount), trackTitle: track.title }, serverTime: new Date().toISOString() }, { status: existing ? 200 : 201 });
  } catch (error) { return marketplaceError(error); }
}
