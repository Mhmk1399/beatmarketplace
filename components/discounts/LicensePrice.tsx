"use client";

import { formatPrice } from "@/components/marketplace/MarketplaceProvider";
import { useDiscountActive, discountNow } from "@/components/discounts/clock";
import { effectiveLicensePrice } from "@/lib/marketplace/discounts";
import type { MarketplaceLicense } from "@/lib/marketplace/types";

export function LicensePrice({ license, large = false }: { license: MarketplaceLicense; large?: boolean }) {
  const active = useDiscountActive(license.discount);
  const price = effectiveLicensePrice(license, discountNow());
  const original = Number(license.originalPrice ?? license.price);
  return <span className={`discount-price${large ? " discount-price-large" : ""}`}>
    {active && original > price && <del>{formatPrice(original, license.currency)}</del>}
    <strong>{formatPrice(price, license.currency)}</strong>
  </span>;
}
