import { NextResponse } from "next/server";
import { heroCreateSchema, heroQuerySchema, validateHeroBooking } from "@/lib/hero/validation";
import { requireEligibleHeroTrack, serializeAdminHeroPlacements } from "@/lib/hero/server";
import { marketplaceError, MarketplaceError, requireMarketplaceRole } from "@/lib/marketplace/server";
import HeroPlacementModel from "@/models/HeroPlacement";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await requireMarketplaceRole(request, "ADMIN");
    if (!auth.ok) return auth.response;
    const query = heroQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const [placements, total] = await Promise.all([
      HeroPlacementModel.find({}).sort({ position: 1, startsAt: -1, _id: -1 }).skip((query.page - 1) * query.pageSize).limit(query.pageSize),
      HeroPlacementModel.countDocuments({}),
    ]);
    return NextResponse.json({ placements: await serializeAdminHeroPlacements(placements), total, ...query, hasMore: query.page * query.pageSize < total, serverTime: new Date().toISOString() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return marketplaceError(error); }
}

export async function POST(request: Request) {
  try {
    const auth = await requireMarketplaceRole(request, "ADMIN");
    if (!auth.ok) return auth.response;
    const data = heroCreateSchema.parse(await request.json());
    const values = { ...data, startsAt: new Date(data.startsAt), endsAt: new Date(data.endsAt) };
    const issue = validateHeroBooking(values);
    if (issue) throw new MarketplaceError(issue);
    await requireEligibleHeroTrack(data.trackId);
    const placement = await HeroPlacementModel.create({ ...values, createdBy: auth.user._id, updatedBy: auth.user._id });
    return NextResponse.json({ placement: (await serializeAdminHeroPlacements([placement]))[0], serverTime: new Date().toISOString() }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return marketplaceError(error); }
}
