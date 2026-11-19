import TrackModel from "@/models/Track";
import { z } from "zod";
import { serializeTracks } from "@/lib/marketplace/server";
import { cursorFilter, escapeRegex, json, requireOrigin, requireUser, resourcePage, workspaceError } from "@/lib/workspace/server";
import { mutateAdminTrack } from "@/lib/workspace/tracks";
const querySchema = z.object({ q: z.string().trim().max(160).default(""), limit: z.coerce.number().int().min(1).max(50).default(20), cursor: z.string().max(256).optional(), status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"]).optional() }).strict();
export const runtime = "nodejs";
export async function GET(request: Request) { try { const auth = await requireUser(request, "ADMIN"); if (!auth.ok) return auth.response; const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams)); const records = await TrackModel.find({ ...(query.q ? { title: { $regex: escapeRegex(query.q), $options: "i" } } : {}), ...(query.status ? { status: query.status } : {}), ...cursorFilter(query.cursor) }).sort({ createdAt: -1, _id: -1 }).limit(query.limit + 1); const result = resourcePage(records, query.limit), items = await serializeTracks(result.page); return json({ items: items.map((item, index) => ({ ...item, version: result.page[index].__v, createdAt: result.page[index].createdAt.toISOString() })), hasMore: result.hasMore, nextCursor: result.nextCursor }); } catch (error) { return workspaceError(error); } }
export async function POST(request: Request) { try { requireOrigin(request); const auth = await requireUser(request, "ADMIN"); if (!auth.ok) return auth.response; return await mutateAdminTrack(request); } catch (error) { return workspaceError(error); } }
