import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import mongoose from "mongoose";
import { z } from "zod";
import { getJwtSecret } from "@/lib/config";
import { invalidatePopularSearches, searchCatalog } from "@/lib/search/server";
import PopularSearchModel, { SearchReceiptModel } from "@/models/PopularSearch";
import { json, readJson, requireOrigin, workspaceError } from "@/lib/workspace/server";
const cookieName = "beatmarketplace_search";
const signature = (id: string) => createHmac("sha256", getJwtSecret()).update("search-visitor:" + id).digest("hex");
function visitor(request: Request) {
  const raw = request.headers.get("cookie")?.split(";").map(value => value.trim()).find(value => value.startsWith(cookieName + "="))?.slice(cookieName.length + 1) || "";
  const [id, signed] = raw.split(".");
  if (/^[a-f\d-]{36}$/i.test(id || "") && /^[a-f\d]{64}$/.test(signed || "") && timingSafeEqual(Buffer.from(signature(id)), Buffer.from(signed))) return { id, value: raw };
  const next = randomUUID(); return { id: next, value: next + "." + signature(next) };
}
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const { q } = z.object({ q: z.string().trim().min(2).max(100) }).strict().parse(await readJson(request, 1024));
    const result = await searchCatalog(q, 1, true);
    if (!result.trendTerm) return json({ recorded: false });
    const who = visitor(request), day = Math.floor(Date.now() / 86400000);
    const receiptId = createHash("sha256").update(`${who.id}:${day}`).digest("hex");
    const termId = createHash("sha256").update(result.trendTerm).digest("hex");
    const session = await mongoose.startSession();
    let recorded = false;
    try {
      await session.withTransaction(async () => {
        await SearchReceiptModel.updateOne({ _id: receiptId, terms: { $ne: termId }, "terms.39": { $exists: false } }, { $addToSet: { terms: termId }, $setOnInsert: { expiresAt: new Date((day + 2) * 86400000) } }, { upsert: true, session });
        await PopularSearchModel.updateOne({ term: result.trendTerm }, { $inc: { count: 1 }, $set: { lastSearchedAt: new Date() } }, { upsert: true, session });
        recorded = true;
      }, { timeoutMS: 5000, maxCommitTimeMS: 2000 });
    } catch (error) { if (!(typeof error === "object" && error && "code" in error && error.code === 11000)) throw error; }
    finally { await session.endSession(); }
    if (recorded) invalidatePopularSearches();
    const response = json({ recorded });
    response.headers.append("Set-Cookie", `${cookieName}=${who.value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=7776000${process.env.NODE_ENV === "production" && new URL(request.url).protocol === "https:" ? "; Secure" : ""}`);
    return response;
  } catch (error) { return workspaceError(error); }
}
