import HeroPlacementModel from "@/models/HeroPlacement";
import TrackModel from "@/models/Track";
import { json, requireUser, workspaceError } from "@/lib/workspace/server";
import { producerPromotionDtos } from "@/lib/workspace/producer-promotions";

export const runtime = "nodejs";
export async function GET(request: Request) { try {
  const auth = await requireUser(request, "PRODUCER"); if (!auth.ok) return auth.response;
  const trackIds = await TrackModel.find({ producerId: auth.user._id }).distinct("_id");
  const placements = await HeroPlacementModel.find({ trackId: { $in: trackIds } }).sort({ startsAt: -1, _id: -1 }).limit(500).lean();
  const tracks = await TrackModel.find({ _id: { $in: placements.map(item => item.trackId) }, producerId: auth.user._id }).select("title").lean();
  const titles = new Map(tracks.map(track => [String(track._id), track.title]));
  return json({ placements: producerPromotionDtos(placements, titles) });
 } catch (error) { return workspaceError(error); } }
