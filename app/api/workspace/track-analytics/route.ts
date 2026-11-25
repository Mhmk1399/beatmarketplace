import { z } from "zod";
import TrackModel from "@/models/Track";
import TrackMetricModel from "@/models/TrackMetric";
import { escapeRegex, json, requireUser, workspaceError } from "@/lib/workspace/server";

export const runtime = "nodejs";
const querySchema = z.object({ scope: z.enum(["admin", "producer"]), q: z.string().trim().max(160).default(""), page: z.coerce.number().int().min(1).max(1000).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(20), sort: z.enum(["newest", "views", "visitors"]).default("newest") }).strict();

export async function GET(request: Request) {
  try {
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const auth = await requireUser(request, query.scope === "admin" ? "ADMIN" : "PRODUCER");
    if (!auth.ok) return auth.response;
    const scopeFilter = query.scope === "producer" ? { producerId: auth.user._id } : {};
    const allTracks = await TrackModel.find(scopeFilter).select("title slug artwork status visibility createdAt").lean().maxTimeMS(3000);
    const metrics = await TrackMetricModel.find({ _id: { $in: allTracks.map(track => track._id) } }).lean().maxTimeMS(2000);
    const counts = new Map(metrics.map(metric => [String(metric._id), metric]));
    const all = allTracks.map(track => { const metric = counts.get(String(track._id)); return { id: String(track._id), slug: track.slug, title: track.title, artworkUrl: track.artwork?.publicUrl ?? null, status: track.status, visibility: track.visibility, createdAt: track.createdAt.toISOString(), views: metric?.views ?? 0, uniqueVisitors: metric?.uniqueVisitors ?? 0, lastViewedAt: metric?.lastViewedAt?.toISOString() ?? null }; });
    const totalViews = all.reduce((sum, track) => sum + track.views, 0), uniqueVisitors = all.reduce((sum, track) => sum + track.uniqueVisitors, 0);
    const highest = [...all].sort((a,b) => b.views - a.views)[0] ?? null;
    const matching = query.q ? all.filter(track => new RegExp(escapeRegex(query.q), "i").test(track.title)) : all;
    matching.sort(query.sort === "views" ? (a,b) => b.views - a.views || b.createdAt.localeCompare(a.createdAt) : query.sort === "visitors" ? (a,b) => b.uniqueVisitors - a.uniqueVisitors || b.createdAt.localeCompare(a.createdAt) : (a,b) => b.createdAt.localeCompare(a.createdAt));
    const start = (query.page - 1) * query.pageSize, items = matching.slice(start, start + query.pageSize);
    return json({ items, total: matching.length, page: query.page, pageSize: query.pageSize, hasMore: start + query.pageSize < matching.length, summary: { totalViews, uniqueVisitors, highestViewed: highest?.views ? { id: highest.id, title: highest.title, views: highest.views } : null, viewedTracks: all.filter(track => track.views > 0).length, totalTracks: all.length } });
  } catch (error) { return workspaceError(error); }
}
