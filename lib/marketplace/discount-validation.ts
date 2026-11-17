import { z } from "zod";
import { objectIdSchema } from "@/lib/marketplace/validation";

const instant = z.iso.datetime({ offset: true });
export const discountCreateSchema = z.object({
  trackId: objectIdSchema,
  percentage: z.number().int().min(1).max(90),
  startsAt: instant,
  endsAt: instant,
}).strict();
export const discountPatchSchema = discountCreateSchema.omit({ trackId: true }).partial().extend({ isActive: z.boolean().optional() }).strict()
  .refine((data) => Object.keys(data).length > 0, "Provide at least one change.");
export const discountsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(24),
});

export function validateDiscountWindow(discount: { startsAt: Date; endsAt: Date; isActive: boolean }, now = new Date()) {
  if (!Number.isFinite(discount.startsAt.getTime()) || !Number.isFinite(discount.endsAt.getTime())) return "Enter valid start and end times.";
  if (discount.endsAt <= discount.startsAt) return "The discount must end after it starts.";
  if (discount.endsAt.getTime() - discount.startsAt.getTime() > 90 * 24 * 60 * 60 * 1000) return "A discount can last at most 90 days.";
  if (discount.isActive && discount.endsAt <= now) return "Choose an end time in the future.";
  return null;
}
