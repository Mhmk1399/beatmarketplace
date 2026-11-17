import { z } from "zod";
import { objectIdSchema } from "@/lib/marketplace/validation";

export const MAX_HERO_PLACEMENTS = 10;
export const MAX_HERO_WINDOW_DAYS = 366;
const instant = z.iso.datetime({ offset: true });
const fields = {
  trackId: objectIdSchema,
  position: z.number().int().min(0).max(10_000),
  startsAt: instant,
  endsAt: instant,
  isActive: z.boolean(),
  label: z.string().trim().max(40),
  agreedFeeToman: z.number().int().min(0).max(1_000_000_000),
  paymentStatus: z.enum(["PENDING", "PAID", "COMPLIMENTARY"]),
  paymentReference: z.string().trim().max(160),
};
export const heroCreateSchema = z.object({
  ...fields,
  position: fields.position.default(0),
  isActive: fields.isActive.default(true),
  label: fields.label.default("Featured"),
  agreedFeeToman: fields.agreedFeeToman.default(0),
  paymentStatus: fields.paymentStatus.default("PENDING"),
  paymentReference: fields.paymentReference.default(""),
}).strict();
export const heroPatchSchema = z.object(fields).partial().extend({ expectedVersion: z.number().int().min(1).optional() }).strict()
  .refine((data) => Object.keys(data).some((key) => key !== "expectedVersion"), "Provide at least one change.");
export const heroQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(24),
});

export function validateHeroBooking(booking: { startsAt: Date; endsAt: Date; isActive: boolean; paymentStatus: string; agreedFeeToman: number }, now = new Date(), requireFutureEnd = true) {
  if (!Number.isFinite(booking.startsAt.getTime()) || !Number.isFinite(booking.endsAt.getTime())) return "Enter valid start and end times.";
  if (booking.endsAt <= booking.startsAt) return "The placement must end after it starts.";
  if (booking.endsAt.getTime() - booking.startsAt.getTime() > MAX_HERO_WINDOW_DAYS * 86400_000) return `A placement can last at most ${MAX_HERO_WINDOW_DAYS} days.`;
  if (requireFutureEnd && booking.isActive && booking.endsAt <= now) return "Choose an end time in the future or disable this placement.";
  if (booking.paymentStatus === "PAID" && booking.agreedFeeToman < 1) return "Record a positive agreed fee for a paid placement.";
  return null;
}

/** The interval is start-inclusive and end-exclusive, matching public database queries. */
export function heroPlacementIsLive(placement: { startsAt: string | Date; endsAt: string | Date; isActive: boolean; paymentStatus: string }, now = Date.now()) {
  const start = new Date(placement.startsAt).getTime();
  const end = new Date(placement.endsAt).getTime();
  return placement.isActive && ["PAID", "COMPLIMENTARY"].includes(placement.paymentStatus) && Number.isFinite(start) && Number.isFinite(end) && start <= now && end > now;
}
