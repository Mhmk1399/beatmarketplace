import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { marketplaceError, publicTrackFilter, serializeTracks } from "@/lib/marketplace/server";
import FavoriteModel from "@/models/Favorite";
import TrackModel from "@/models/Track";
import UserModel from "@/models/User";

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.ok) return auth.response;
    const favorites = await FavoriteModel.find({ userId: auth.user._id }).sort({ createdAt: -1 }).limit(500);
    const candidates = await TrackModel.find({ ...publicTrackFilter, _id: { $in: favorites.map((favorite) => favorite.trackId) } });
    const producerIds = [...new Set(candidates.map((track) => String(track.producerId)))];
    const activeProducers = await UserModel.find({ _id: { $in: producerIds }, status: "ACTIVE", roles: "PRODUCER" }).select("_id");
    const allowed = new Set(activeProducers.map((producer) => String(producer._id)));
    const tracks = candidates.filter((track) => allowed.has(String(track.producerId)));
    const byId = new Map((await serializeTracks(tracks)).map((track) => [track.id, track]));
    return NextResponse.json({ tracks: favorites.flatMap((favorite) => byId.get(String(favorite.trackId)) ? [byId.get(String(favorite.trackId))] : []), serverTime: new Date().toISOString() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return marketplaceError(error); }
}
