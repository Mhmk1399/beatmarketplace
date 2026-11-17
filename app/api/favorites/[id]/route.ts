import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { marketplaceError, producerIsPublic, publicTrackFilter } from "@/lib/marketplace/server";
import { objectIdSchema } from "@/lib/marketplace/validation";
import FavoriteModel from "@/models/Favorite";
import TrackModel from "@/models/Track";
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.ok) return auth.response;
    const id = objectIdSchema.parse((await params).id);
    const track = await TrackModel.findOne({ _id: id, ...publicTrackFilter }).select("producerId");
    if (!track || !await producerIsPublic(track.producerId)) return NextResponse.json({ error: "Track not found." }, { status: 404 });
    await FavoriteModel.updateOne({ userId: auth.user._id, trackId: id }, { $setOnInsert: { userId: auth.user._id, trackId: id } }, { upsert: true });
    return NextResponse.json({ saved: true });
  } catch (error) { return marketplaceError(error); }
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.ok) return auth.response;
    const id = objectIdSchema.parse((await params).id);
    await FavoriteModel.deleteOne({ userId: auth.user._id, trackId: id });
    return NextResponse.json({ saved: false });
  } catch (error) { return marketplaceError(error); }
}
