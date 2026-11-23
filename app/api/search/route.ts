import { consumeApiQuota } from "@/lib/security/rate-limit";
import { z } from "zod";
import { searchCatalog } from "@/lib/search/server";
import { json, workspaceError } from "@/lib/workspace/server";
const schema = z.object({ q: z.string().trim().min(2).max(100), page: z.coerce.number().int().min(1).max(24).default(1), mode: z.enum(["suggest", "results"]).default("results") }).strict();
export const runtime = "nodejs";
export async function GET(request: Request) {
  try { await consumeApiQuota("public-search", "all", 1200, 60_000); const query = schema.parse(Object.fromEntries(new URL(request.url).searchParams)); return json(await searchCatalog(query.q, query.page, query.mode === "suggest")); }
  catch (error) { return workspaceError(error); }
}
