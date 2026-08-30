import { z } from "zod";

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(8).max(128);
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "A valid MongoDB object ID is required.");

export const registerSchema = z.object({
  email,
  password,
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phoneNumber: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, "Use E.164 format, for example +989121234567.").optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export const producerProfileSchema = z.object({
  stageName: z.string().trim().min(1).max(120).optional(),
  bio: z.string().trim().max(1_000).default(""),
  genreIds: z.array(objectId).max(10).default([]),
  storefrontName: z.string().trim().min(1).max(120).optional(),
});

export function validationError(error: z.ZodError) {
  return {
    error: "Invalid request data.",
    issues: error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  };
}
