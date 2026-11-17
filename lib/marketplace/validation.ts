import { z } from "zod";

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "A valid record ID is required.");
export const taxonomyKindSchema = z.enum(["genres", "moods", "instruments"]);

export const trackInputSchema = z.object({
  title: z.string().trim().min(1, "Enter a track title.").max(160),
  description: z.string().trim().max(4_000).default(""),
  bpm: z.number().int().min(20).max(400),
  musicalKey: z.string().trim().min(1).max(20),
  genreId: objectIdSchema.nullable().default(null),
  tags: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  previewStartSeconds: z.number().finite().min(0).max(86_400).default(0),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PRIVATE"),
}).strict();

// Zod applies defaults inside optional fields, so remove them before making PATCH fields optional.
export const trackPatchSchema = z.object({
  ...trackInputSchema.shape,
  description: trackInputSchema.shape.description.removeDefault(),
  genreId: trackInputSchema.shape.genreId.removeDefault(),
  tags: trackInputSchema.shape.tags.removeDefault(),
  previewStartSeconds: trackInputSchema.shape.previewStartSeconds.removeDefault(),
  status: trackInputSchema.shape.status.removeDefault(),
  visibility: trackInputSchema.shape.visibility.removeDefault(),
}).partial().strict();

export const trackQuerySchema = z.object({
  q: z.string().trim().max(160).default(""),
  genreId: objectIdSchema.optional(),
  minBpm: z.coerce.number().int().min(20).max(400).optional(),
  maxBpm: z.coerce.number().int().min(20).max(400).optional(),
  key: z.string().trim().max(20).optional(),
  sort: z.enum(["newest", "price-asc", "price-desc"]).default("newest"),
  pagination: z.enum(["offset", "cursor"]).default("offset"),
  cursor: z.string().min(1).max(256).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(24),
}).refine((value) => value.minBpm === undefined || value.maxBpm === undefined || value.minBpm <= value.maxBpm, {
  path: ["minBpm"], message: "Minimum BPM must not exceed maximum BPM.",
});

// Prices remain exact decimal strings in MongoDB and integer toman in payment requests.
export const tomanPriceSchema = z.string().trim().regex(/^\d{1,10}$/, "Enter a whole amount in toman.")
  .refine((value) => Number(value) >= 1_000 && Number(value) <= 1_000_000_000, "Price must be between 1,000 and 1,000,000,000 toman.")
  .transform((value) => String(Number(value)));

export const contractInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  price: tomanPriceSchema,
  currency: z.literal("IRT").default("IRT"),
  trackIds: z.array(objectIdSchema).min(1).max(100).refine((ids) => new Set(ids).size === ids.length, "Select each track only once."),
  licenseType: z.enum(["NON_EXCLUSIVE", "EXCLUSIVE"]).default("NON_EXCLUSIVE"),
  formats: z.array(z.literal("WAV")).length(1).default(["WAV"]),
  streamingLimit: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable().default(null),
  distributionLimit: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable().default(null),
  customTerms: z.string().trim().max(20_000).default(""),
}).strict();

export const contractPatchSchema = z.object({
  ...contractInputSchema.shape,
  currency: contractInputSchema.shape.currency.removeDefault(),
  licenseType: contractInputSchema.shape.licenseType.removeDefault(),
  formats: contractInputSchema.shape.formats.removeDefault(),
  streamingLimit: contractInputSchema.shape.streamingLimit.removeDefault(),
  distributionLimit: contractInputSchema.shape.distributionLimit.removeDefault(),
  customTerms: contractInputSchema.shape.customTerms.removeDefault(),
}).partial().strict();

export const taxonomyInputSchema = z.object({
  kind: taxonomyKindSchema,
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().toLowerCase().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens."),
  isActive: z.boolean().default(true),
}).strict();

export const taxonomyPatchSchema = z.object({
  ...taxonomyInputSchema.shape,
  isActive: taxonomyInputSchema.shape.isActive.removeDefault(),
}).partial().extend({ kind: taxonomyKindSchema }).strict();

export type TrackInput = z.infer<typeof trackInputSchema>;
export type ContractInput = z.infer<typeof contractInputSchema>;
