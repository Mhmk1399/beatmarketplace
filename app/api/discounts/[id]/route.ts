import { NextResponse } from "next/server";
import { discountPatchSchema, validateDiscountWindow } from "@/lib/marketplace/discount-validation";
import { serializeDiscount } from "@/lib/marketplace/discount-server";
import { marketplaceError, MarketplaceError, requireMarketplaceRole } from "@/lib/marketplace/server";
import { objectIdSchema } from "@/lib/marketplace/validation";
import TrackModel from "@/models/Track";
import TrackDiscountModel from "@/models/TrackDiscount";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireMarketplaceRole(request, "PRODUCER");
    if (!auth.ok) return auth.response;
    const id = objectIdSchema.parse((await params).id);
    const data = discountPatchSchema.parse(await request.json());
    const discount = await TrackDiscountModel.findOne({ _id: id, producerId: auth.user._id });
    if (!discount) throw new MarketplaceError("This discount could not be found.", 404);
    const track = await TrackModel.findOne({ _id: discount.trackId, producerId: auth.user._id }).select("title status");
    if (!track) throw new MarketplaceError("This track is unavailable.", 404);
    if (data.percentage !== undefined) discount.percentage = data.percentage;
    if (data.startsAt !== undefined) discount.startsAt = new Date(data.startsAt);
    if (data.endsAt !== undefined) discount.endsAt = new Date(data.endsAt);
    if (data.isActive !== undefined) discount.isActive = data.isActive;
    const issue = validateDiscountWindow(discount);
    if (issue) throw new MarketplaceError(issue);
    if (discount.isActive && track.status === "ARCHIVED") throw new MarketplaceError("Restore this track before activating its discount.", 409);
    discount.version += 1;
    await discount.save();
    return NextResponse.json({ discount: { ...serializeDiscount(discount), trackTitle: track.title }, serverTime: new Date().toISOString() });
  } catch (error) { return marketplaceError(error); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireMarketplaceRole(request, "PRODUCER");
    if (!auth.ok) return auth.response;
    const id = objectIdSchema.parse((await params).id);
    const discount = await TrackDiscountModel.findOne({ _id: id, producerId: auth.user._id });
    if (!discount) throw new MarketplaceError("This discount could not be found.", 404);
    if (discount.isActive) { discount.isActive = false; discount.version += 1; await discount.save(); }
    return NextResponse.json({ discount: serializeDiscount(discount), serverTime: new Date().toISOString() });
  } catch (error) { return marketplaceError(error); }
}
