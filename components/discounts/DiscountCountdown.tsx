"use client";

import { formatPersianDateTime } from "@/lib/date-time";

import { useDiscountSecond } from "@/components/discounts/clock";
import type { TrackDiscount } from "@/lib/marketplace/types";
import { discountIsActive } from "@/lib/marketplace/discounts";

export function DiscountCountdown({ discount, compact = false }: { discount: TrackDiscount; compact?: boolean }) {
  const now = useDiscountSecond();
  const active = now > 0 && discountIsActive(discount, now);
  const seconds = active ? Math.max(0, Math.ceil((Date.parse(discount.endsAt) - now) / 1000)) : 0;
  if (!active) return null;
  const units = [
    { value: Math.floor(seconds / 86400), label: "Days" },
    { value: Math.floor(seconds / 3600) % 24, label: "Hrs" },
    { value: Math.floor(seconds / 60) % 60, label: "Min" },
    { value: seconds % 60, label: "Sec" },
  ];
  return <div className={`discount-countdown${compact ? " discount-countdown-compact" : ""}`}>
    <div className="discount-countdown-heading"><span className="discount-countdown-dot" aria-hidden="true" /><span>Offer ends in</span><span className="discount-countdown-saving">−{discount.percentage}%</span></div>
    <span className="sr-only">Offer ends <time dateTime={discount.endsAt}>{formatPersianDateTime(discount.endsAt)}</time>.</span>
    <div className="discount-countdown-units" aria-hidden="true">{units.map((unit) => <span key={unit.label} className="discount-countdown-unit"><strong>{String(unit.value).padStart(2, "0")}</strong><span>{unit.label}</span></span>)}</div>
  </div>;
}
