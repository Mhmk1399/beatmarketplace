import { createHmac } from "node:crypto";
import { getJwtSecret } from "@/lib/config";
import { connectToDatabase } from "@/lib/db";
import ApiRateLimit from "@/models/ApiRateLimit";
import { ApiSecurityError } from "./request";

/** Atomic, shared across app instances. No raw account identity or IP is persisted. */
export async function consumeApiQuota(scope: string, identity: string, limit: number, windowMs: number) {
  const now = Date.now(), bucket = Math.floor(now / windowMs);
  const key = createHmac("sha256", getJwtSecret()).update(JSON.stringify([scope, identity, bucket])).digest("hex");
  await connectToDatabase();
  try {
    await ApiRateLimit.updateOne({ _id: key, count: { $lt: limit } }, {
      $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 2) * windowMs) },
    }, { upsert: true });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === 11000) {
      throw new ApiSecurityError("Too many requests. Please try again shortly.", 429, Math.max(1, Math.ceil(((bucket + 1) * windowMs - now) / 1000)));
    }
    throw error;
  }
}
