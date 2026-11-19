import { z } from "zod";
import { idSchema } from "@/lib/workspace/validation";
import { PRODUCER_SOCIALS } from "./types";

const line = (length: number) => z.string().trim().max(length).regex(/^[^\u0000-\u001f\u007f]*$/, "Enter a single line of text.");
const website = z.union([z.literal(""), z.url().max(2048).refine(value => { const parsed = new URL(value); return ["http:", "https:"].includes(parsed.protocol) && !parsed.username && !parsed.password; }, "Use a valid HTTP or HTTPS website URL.")]);
const social = website.refine(value => !value || value.startsWith("https://"), "Use an HTTPS social link.");
const ids = (max: number) => z.array(idSchema).max(max).refine(values => new Set(values).size === values.length, "Choose each item once.");
export const producerPageSettingsSchema = z.object({
  stageName: line(120).min(1, "Enter your producer name."), storefrontName: line(120).min(1, "Enter your studio name."),
  bio: z.string().trim().max(1000), expectedVersion: z.number().int().min(0),
  tagline: line(160).optional(), location: line(120).optional(), website: website.optional(),
  genreIds: ids(10).optional(), featuredTrackIds: ids(6).optional(),
  layout: z.enum(["IMMERSIVE", "COMPACT"]).optional(), bannerPosition: z.enum(["top", "center", "bottom"]).optional(),
  socialLinks: z.object(Object.fromEntries(PRODUCER_SOCIALS.map(name => [name, social.optional()])) as Record<typeof PRODUCER_SOCIALS[number], z.ZodOptional<typeof social>>).strict().optional(),
  removeBanner: z.boolean().optional(),
}).strict();
export const producerDirectorySchema = z.object({ q: line(80).default(""), cursor: z.string().max(256).optional(), limit: z.coerce.number().int().min(1).max(24).default(12) }).strict();
export const producerBeatsSchema = z.object({ q: line(160).default(""), cursor: z.string().max(256).optional(), limit: z.coerce.number().int().min(1).max(24).default(12) }).strict();
