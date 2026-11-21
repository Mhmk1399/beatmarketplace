import { z } from "zod";
import TrackModel from "@/models/Track";
import TrackMetricModel from "@/models/TrackMetric";
import { cursorFilter, escapeRegex, json, requireUser, resourcePage, workspaceError } from "@/lib/workspace/server";

export const runtime = "nodejs";
const querySchema = z.object({ scope: z.enum(["admin", "producer"]), q: z.string().trim().max(160).default(""), limit: z.coerce.number().int().min(1).max(50).default(20), cursor: z.string().max(256).optional() }).strict();

export async function GET(request: Request) {
  try {
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const auth = await requireUser(request, query.scope === "admin" ? "ADMIN" : "PRODUCER");
    if (!auth.ok) return auth.response;
    const records = await TrackModel.find({
      ...(query.scope === "producer" ? { producerId: auth.user._id } : {}),
      ...(query.q ? { title: { $regex: escapeRegex(query.q), $options: "i" } } : {}), ...cursorFilter(query.cursor),
    }).sort({ createdAt: -1, _id: -1 }).limit(query.limit + 1).select("title slug artwork status visibility createdAt").maxTimeMS(1500);
    const page = resourcePage(records, query.limit);
    // One indexed batch lookup for the visible page; no per-row requests or visitor aggregation.
    const metrics = await TrackMetricModel.find({ _id: { $in: page.page.map(track => track._id) } }).lean().maxTimeMS(1000);
    const counts = new Map(metrics.map(metric => [String(metric._id), metric]));
    const items = page.page.map(track => {
      const metric = counts.get(String(track._id));
      return { id: String(track._id), slug: track.slug, title: track.title, artworkUrl: track.artwork?.publicUrl ?? null, status: track.status, visibility: track.visibility,
        views: metric?.views ?? 0, uniqueVisitors: metric?.uniqueVisitors ?? 0, lastViewedAt: metric?.lastViewedAt?.toISOString() ?? null };
    });
    return json({ items, hasMore: page.hasMore, nextCursor: page.nextCursor });
  } catch (error) { return workspaceError(error); }
}
