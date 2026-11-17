import type { MarketplaceLicense, TrackDiscount } from "@/lib/marketplace/types";

export type DiscountWindow = Pick<TrackDiscount, "percentage" | "startsAt" | "endsAt" | "isActive">;
type Time = number | Date;

/** All boundaries are instants, not browser-local dates. The end is exclusive. */
export function discountIsActive(discount: DiscountWindow | null | undefined, now: Time = Date.now()) {
  if (!discount?.isActive || !Number.isInteger(discount.percentage) || discount.percentage < 1 || discount.percentage > 90) return false;
  const startsAt = Date.parse(discount.startsAt);
  const endsAt = Date.parse(discount.endsAt);
  const timestamp = Number(now);
  return Number.isFinite(timestamp) && Number.isFinite(startsAt) && Number.isFinite(endsAt) && startsAt <= timestamp && timestamp < endsAt;
}

/** Integer toman, rounded half-up. No binary fraction or currency conversion. */
export function computeDiscountedPrice(basePrice: number | string, discount: DiscountWindow | null | undefined, now: Time = Date.now()) {
  const base = Number(basePrice);
  if (!Number.isSafeInteger(base) || base < 1 || base > 1_000_000_000) throw new RangeError("The base price must be a positive whole toman amount.");
  if (!discountIsActive(discount, now)) return base;
  return Math.max(1, Math.floor((base * (100 - discount!.percentage) + 50) / 100));
}

/** Re-evaluate a cached license when its campaign starts/ends; never stack discounts. */
export function effectiveLicensePrice(license: Pick<MarketplaceLicense, "price" | "originalPrice" | "discount">, now: Time = Date.now()) {
  return computeDiscountedPrice(license.originalPrice ?? license.price, license.discount, now);
}

export function discountStatus(discount: DiscountWindow, now: Time = Date.now()) {
  if (!discount.isActive) return "DISABLED" as const;
  if (Date.parse(discount.endsAt) <= Number(now)) return "EXPIRED" as const;
  if (Date.parse(discount.startsAt) > Number(now)) return "SCHEDULED" as const;
  return discountIsActive(discount, now) ? "ACTIVE" as const : "INVALID" as const;
}
