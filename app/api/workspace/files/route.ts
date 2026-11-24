import TrackModel from "@/models/Track";
import { json, requireUser, workspaceError } from "@/lib/workspace/server";
import { producerAssetDto } from "@/lib/workspace/producer-assets";

export const runtime = "nodejs";
export async function GET(request: Request) { try {
  const auth = await requireUser(request, "PRODUCER"); if (!auth.ok) return auth.response;
  const tracks = await TrackModel.find({ producerId: auth.user._id }).select("+audio.master title artwork audio.preview createdAt").sort({ createdAt: -1, _id: -1 }).lean();
  const assets = tracks.flatMap(track => {
    const id = String(track._id);
    return [track.audio.master && producerAssetDto(id, track.title, "Master WAV", track.audio.master), track.audio.preview && producerAssetDto(id, track.title, "Public preview", track.audio.preview), track.artwork && producerAssetDto(id, track.title, "Artwork", track.artwork)].filter((value): value is NonNullable<typeof value> => Boolean(value));
  });
  return json({ assets, summary: { tracks: tracks.length, assets: assets.length, bytes: assets.reduce((total, asset) => total + asset.sizeBytes, 0) } });
 } catch (error) { return workspaceError(error); } }
