import type { TrackDiscount } from "@/lib/marketplace/types";
import type { TrackDiscountFields } from "@/models/TrackDiscount";

export function activeDiscountFilter(now = new Date()) {
  return { isActive: true, startsAt: { $lte: now }, endsAt: { $gt: now } };
}
export function serializeDiscount(discount: TrackDiscountFields & { _id: unknown }): TrackDiscount {
  return {
    id: String(discount._id), trackId: String(discount.trackId), percentage: discount.percentage,
    startsAt: discount.startsAt.toISOString(), endsAt: discount.endsAt.toISOString(), isActive: discount.isActive, version: discount.version,
  };
}
