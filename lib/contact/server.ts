import { isSameRequestOrigin, readSecureJson, securityErrorResponse } from "@/lib/security/request";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authenticateRequest } from "@/lib/auth";
import ContactRateLimitModel from "@/models/ContactRateLimit";
import type { ContactMessageFields } from "@/models/ContactMessage";
import type { ContactMessage } from "./types";

export class ContactError extends Error {
  constructor(message: string, public status = 400, public retryAfter?: number) { super(message); }
}
export function contactJson(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", ...headers } });
}
export function contactError(error: unknown) {
  const secured = securityErrorResponse(error); if (secured) return secured;
  if (error instanceof ZodError) return contactJson({ error: "Please check the highlighted fields.", issues: error.issues.map(issue => ({ field: issue.path.join("."), message: issue.message })) }, 400);
  if (error instanceof ContactError) return contactJson({ error: error.message }, error.status, error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {});
  if (error instanceof SyntaxError) return contactJson({ error: "Invalid JSON request." }, 400);
  // Do not log submitted messages, email addresses, database details or credentials.
  console.error("Contact request failed", error instanceof Error ? error.name : "Unknown error");
  return contactJson({ error: "We couldn't save your message right now. Please try again shortly." }, 503);
}
export function requireContactOrigin(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site" || !isSameRequestOrigin(request)) throw new ContactError("This request must come from this website.", 403);
}
export async function readContactJson(request: Request, maxBytes = 16 * 1024) {
  return readSecureJson(request, maxBytes);
}
export function contactPayloadHash(data: { name: string; email: string; subject: string; message: string }) {
  return createHash("sha256").update(JSON.stringify([data.name, data.email, data.subject, data.message])).digest("hex");
}
export async function consumeContactQuota(email: string, now = Date.now()) {
  // Shared across instances. No raw IP/email stored in quota documents; no proxy headers trusted.
  const hour = 3600_000, bucket = Math.floor(now / hour);
  const key = createHash("sha256").update(`${email}:${bucket}`).digest("hex");
  try {
    await ContactRateLimitModel.updateOne({ _id: key, count: { $lt: 5 } }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 2) * hour) } }, { upsert: true });
  } catch (error) {
    if (isDuplicate(error)) throw new ContactError("You've sent several messages. Please try again later.", 429, Math.max(1, Math.ceil(((bucket + 1) * hour - now) / 1000)));
    throw error;
  }
}
export function isDuplicate(error: unknown) { return typeof error === "object" && error !== null && "code" in error && error.code === 11000; }
export function serializeContactMessage(record: ContactMessageFields): ContactMessage {
  return { id: record._id, name: record.name, email: record.email, subject: record.subject, message: record.message, status: record.status, version: record.version, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() };
}
export async function requireContactAdmin(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) { auth.response.headers.set("Cache-Control", "private, no-store"); return auth; }
  if (!auth.user.roles.includes("ADMIN")) return { ok: false as const, response: contactJson({ error: "Admin access required." }, 403) };
  return auth;
}
export function contactCursor(record: ContactMessageFields) {
  return Buffer.from(JSON.stringify({ at: record.createdAt.toISOString(), id: record._id })).toString("base64url");
}
export function parseContactCursor(cursor: string) {
  try {
    const data = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (typeof data.at !== "string" || !Number.isFinite(Date.parse(data.at)) || typeof data.id !== "string" || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(data.id)) throw new Error();
    return { at: new Date(data.at), id: data.id as string };
  } catch { throw new ContactError("Invalid inbox cursor."); }
}
