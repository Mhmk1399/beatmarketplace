import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { heroPatchSchema, validateHeroBooking } from "@/lib/hero/validation";
import { requireEligibleHeroTrack, serializeAdminHeroPlacements } from "@/lib/hero/server";
import { marketplaceError, MarketplaceError, requireMarketplaceRole } from "@/lib/marketplace/server";
import { objectIdSchema } from "@/lib/marketplace/validation";
import HeroPlacementModel from "@/models/HeroPlacement";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireMarketplaceRole(request, "ADMIN");
    if (!auth.ok) return auth.response;
    const id = objectIdSchema.parse((await params).id);
    const { expectedVersion, ...data } = heroPatchSchema.parse(await request.json());
    const placement = await HeroPlacementModel.findById(id);
    if (!placement) throw new MarketplaceError("This hero placement could not be found.", 404);
    if (expectedVersion !== undefined && placement.version !== expectedVersion) throw new MarketplaceError("This placement changed. Refresh before saving again.", 409);
    const wasReady = placement.isActive && placement.paymentStatus !== "PENDING";
    const wasActive = placement.isActive;
    const oldTrack = String(placement.trackId);
    const changedWindow = data.startsAt !== undefined || data.endsAt !== undefined;
    if (data.trackId !== undefined) placement.trackId = new mongoose.Types.ObjectId(data.trackId);
    if (data.position !== undefined) placement.position = data.position;
    if (data.label !== undefined) placement.label = data.label;
    if (data.startsAt !== undefined) placement.startsAt = new Date(data.startsAt);
    if (data.endsAt !== undefined) placement.endsAt = new Date(data.endsAt);
    if (data.isActive !== undefined) placement.isActive = data.isActive;
    if (data.agreedFeeToman !== undefined) placement.agreedFeeToman = data.agreedFeeToman;
    if (data.paymentStatus !== undefined) placement.paymentStatus = data.paymentStatus;
    if (data.paymentReference !== undefined) placement.paymentReference = data.paymentReference;
    const now = new Date();
    const issue = validateHeroBooking(placement, now, changedWindow || (!wasActive && placement.isActive));
    if (issue) throw new MarketplaceError(issue);
    const ready = placement.isActive && placement.paymentStatus !== "PENDING";
    if (oldTrack !== String(placement.trackId) || (ready && placement.endsAt > now && (!wasReady || changedWindow))) await requireEligibleHeroTrack(placement.trackId, now);
    placement.updatedBy = auth.user._id;
    placement.version += 1;
    await placement.save();
    return NextResponse.json({ placement: (await serializeAdminHeroPlacements([placement]))[0], serverTime: new Date().toISOString() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return marketplaceError(error); }
}

/** Disabling must remain possible even after the original track or producer disappears. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireMarketplaceRole(request, "ADMIN");
    if (!auth.ok) return auth.response;
    const id = objectIdSchema.parse((await params).id);
    const placement = await HeroPlacementModel.findById(id);
    if (!placement) throw new MarketplaceError("This hero placement could not be found.", 404);
    if (placement.isActive) {
      placement.isActive = false;
      placement.updatedBy = auth.user._id;
      placement.version += 1;
      await placement.save();
    }
    return NextResponse.json({ placement: (await serializeAdminHeroPlacements([placement]))[0], serverTime: new Date().toISOString() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return marketplaceError(error); }
}
