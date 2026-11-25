import { z } from "zod";
import { MUSICAL_KEYS, normalizeMusicalKey } from "@/lib/music/keys";

export const musicalKeySchema = z
  .string()
  .trim()
  .max(20)
  .transform((value) => normalizeMusicalKey(value) ?? value)
  .pipe(z.enum(MUSICAL_KEYS, { error: "Choose a musical key from the list." }));

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "A valid record ID is required.");
export const taxonomyKindSchema = z.enum(["genres", "moods", "instruments"]);

export const trackInputSchema = z
  .object({
    title: z.string().trim().min(1, "Enter a track title.").max(160),
    description: z.string().trim().max(4_000).default(""),
    bpm: z.number().int().min(20).max(400),
    musicalKey: musicalKeySchema,
    genreId: objectIdSchema.nullable().default(null),
    moodIds: z
      .array(objectIdSchema)
      .max(10)
      .refine((ids) => new Set(ids).size === ids.length)
      .default([]),
    instrumentIds: z
      .array(objectIdSchema)
      .max(20)
      .refine((ids) => new Set(ids).size === ids.length)
      .default([]),
    tags: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
    explicit: z.boolean().default(false),
    previewStartSeconds: z.number().finite().min(0).max(86_400).default(0),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
    visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PRIVATE"),
    collaboratorIds: z
      .array(objectIdSchema)
      .max(20)
      .refine((ids) => new Set(ids).size === ids.length)
      .default([]),
  })
  .strict();

// Zod applies defaults inside optional fields, so remove them before making PATCH fields optional.
export const trackPatchSchema = z
  .object({
    expectedVersion: z.number().int().min(0).optional(),
    ...trackInputSchema.shape,
    description: trackInputSchema.shape.description.removeDefault(),
    genreId: trackInputSchema.shape.genreId.removeDefault(),
    moodIds: trackInputSchema.shape.moodIds.removeDefault(),
    instrumentIds: trackInputSchema.shape.instrumentIds.removeDefault(),
    tags: trackInputSchema.shape.tags.removeDefault(),
    explicit: trackInputSchema.shape.explicit.removeDefault(),
    previewStartSeconds:
      trackInputSchema.shape.previewStartSeconds.removeDefault(),
    status: trackInputSchema.shape.status.removeDefault(),
    visibility: trackInputSchema.shape.visibility.removeDefault(),
    collaboratorIds: trackInputSchema.shape.collaboratorIds.removeDefault(),
  })
  .partial()
  .strict();

export const trackQuerySchema = z
  .object({
    q: z.string().trim().max(160).default(""),
    genreId: objectIdSchema.optional(),
    genre: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    moodId: objectIdSchema.optional(),
    instrumentId: objectIdSchema.optional(),
    minBpm: z.coerce.number().int().min(20).max(400).optional(),
    maxBpm: z.coerce.number().int().min(20).max(400).optional(),
    key: z.union([z.literal(""), musicalKeySchema]).optional(),
    sort: z.enum(["newest", "price-asc", "price-desc"]).default("newest"),
    pagination: z.enum(["offset", "cursor"]).default("offset"),
    cursor: z.string().min(1).max(256).optional(),
    page: z.coerce.number().int().min(1).max(1000).default(1),
    pageSize: z.coerce.number().int().min(1).max(48).default(24),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
    trackId: objectIdSchema.optional(),
  })
  .refine(
    (value) =>
      value.minBpm === undefined ||
      value.maxBpm === undefined ||
      value.minBpm <= value.maxBpm,
    {
      path: ["minBpm"],
      message: "Minimum BPM must not exceed maximum BPM.",
    },
  );

// Prices remain exact decimal strings in MongoDB and integer toman in payment requests.
export const tomanPriceSchema = z
  .string()
  .trim()
  .regex(/^\d{1,10}$/, "Enter a whole amount in toman.")
  .refine(
    (value) => Number(value) >= 1_000 && Number(value) <= 1_000_000_000,
    "Price must be between 1,000 and 1,000,000,000 toman.",
  )
  .transform((value) => String(Number(value)));

export const contractInputSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    price: tomanPriceSchema,
    currency: z.literal("IRT").default("IRT"),
    trackIds: z
      .array(objectIdSchema)
      .min(1)
      .max(100)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Select each track only once.",
      ),
    licenseType: z
      .enum(["NON_EXCLUSIVE", "EXCLUSIVE"])
      .default("NON_EXCLUSIVE"),
    description: z.string().trim().max(8000).default(""),
    commercialUse: z.boolean().default(true),
    creditRequired: z.boolean().default(true),
    creditText: z.string().trim().max(500).default(""),
    musicVideoLimit: z
      .number()
      .int()
      .min(0)
      .max(Number.MAX_SAFE_INTEGER)
      .nullable()
      .default(null),
    livePerformance: z.boolean().default(false),
    broadcastRights: z.boolean().default(false),
    contentIdAllowed: z.boolean().nullable().default(null),
    termMonths: z.number().int().min(1).max(1200).nullable().default(null),
    royaltyPercent: z.number().min(0).max(100).nullable().default(null),
    publishingSharePercent: z.number().min(0).max(100).nullable().default(null),
    governingLaw: z.string().trim().max(500).default(""),
    territory: z
      .object({
        worldwide: z.boolean(),
        includedCountries: z.array(z.string().regex(/^[A-Z]{2}$/)).max(250),
        excludedCountries: z.array(z.string().regex(/^[A-Z]{2}$/)).max(250),
      })
      .strict()
      .refine(
        (t) =>
          (t.worldwide || t.includedCountries.length > 0) &&
          !t.includedCountries.some((code) =>
            t.excludedCountries.includes(code),
          ),
        "Choose permitted countries and avoid overlapping exclusions.",
      )
      .default({
        worldwide: true,
        includedCountries: [],
        excludedCountries: [],
      }),
    formats: z
      .array(z.enum(["MP3", "WAV", "STEMS"]))
      .min(1)
      .max(3)
      .refine(
        (values) => new Set(values).size === values.length,
        "Choose each delivery format once.",
      )
      .default(["WAV"]),
    streamingLimit: z
      .number()
      .int()
      .min(0)
      .max(Number.MAX_SAFE_INTEGER)
      .nullable()
      .default(null),
    distributionLimit: z
      .number()
      .int()
      .min(0)
      .max(Number.MAX_SAFE_INTEGER)
      .nullable()
      .default(null),
    customTerms: z.string().trim().max(20_000).default(""),
  })
  .strict();

// Remove defaults from every field before PATCH, so omitted rights never overwrite existing terms.
export const contractPatchSchema = z
  .object(
    Object.fromEntries(
      Object.entries(contractInputSchema.shape).map(([key, value]) => [
        key,
        value instanceof z.ZodDefault ? value.removeDefault() : value,
      ]),
    ) as {
      [
        K in keyof typeof contractInputSchema.shape
      ]: (typeof contractInputSchema.shape)[K] extends z.ZodDefault<infer T>
        ? T
        : (typeof contractInputSchema.shape)[K];
    },
  )
  .partial()
  .extend({ expectedVersion: z.number().int().positive().optional() })
  .strict();

export const taxonomyInputSchema = z
  .object({
    kind: taxonomyKindSchema,
    name: z.string().trim().min(1, "Enter a name.").max(80),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1)
      .max(100)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use lowercase letters, numbers, and hyphens.",
      ),
    description: z.string().trim().max(1_000).default(""),
    sortOrder: z.number().int().min(0).max(1_000_000).default(0),
    isActive: z.boolean().default(true),
    family: z
      .enum([
        "DRUMS",
        "PERCUSSION",
        "KEYS",
        "STRINGS",
        "WOODWIND",
        "BRASS",
        "GUITAR",
        "BASS",
        "SYNTH",
        "VOCAL",
        "FX",
        "OTHER",
      ])
      .optional(),
    color: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i, "Use a six-digit hex color.")
      .nullable()
      .optional(),
  })
  .strict();

export const taxonomyPatchSchema = z
  .object({
    ...taxonomyInputSchema.shape,
    isActive: taxonomyInputSchema.shape.isActive.removeDefault(),
    description: taxonomyInputSchema.shape.description.removeDefault(),
    sortOrder: taxonomyInputSchema.shape.sortOrder.removeDefault(),
  })
  .partial()
  .extend({
    kind: taxonomyKindSchema,
    expectedVersion: z.number().int().min(0).optional(),
    removeThumbnail: z.boolean().optional(),
    removeBanner: z.boolean().optional(),
  })
  .strict()
  .refine((data) => data.expectedVersion !== undefined, {
    path: ["expectedVersion"],
    message: "Refresh this classification before saving changes.",
  });

export type TrackInput = z.infer<typeof trackInputSchema>;
export type ContractInput = z.infer<typeof contractInputSchema>;
