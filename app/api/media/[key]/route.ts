import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { MediaValidationError, serveStoredAsset } from "@/lib/media/storage";
import TrackModel from "@/models/Track";
import { producerIsPublic } from "@/lib/marketplace/server";

export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    if (!/^[0-9a-f-]{36}\.(preview\.wav|artwork\.(png|jpg|webp))$/.test(key)) return new NextResponse(null, { status: 404 });
    await connectToDatabase();
    const track = await TrackModel.findOne({ $or: [{ "audio.preview.key": key }, { "artwork.key": key }] }).select("producerId status visibility audio.preview artwork");
    if (!track) return new NextResponse(null, { status: 404 });
    if (track.status !== "PUBLISHED" || track.visibility !== "PUBLIC" || !await producerIsPublic(track.producerId)) {
      const auth = await authenticateRequest(request);
      if (!auth.ok || (auth.user.id !== String(track.producerId) && !auth.user.roles.includes("ADMIN"))) return new NextResponse(null, { status: 404 });
    }
    const asset = track.audio.preview?.key === key ? track.audio.preview : track.artwork;
    if (!asset) return new NextResponse(null, { status: 404 });
    return await serveStoredAsset(request, asset);
  } catch (error) {
    if ((error instanceof MediaValidationError && error.status === 404) || (error instanceof Error && "code" in error && error.code === "ENOENT")) return new NextResponse(null, { status: 404 });
    return NextResponse.json({ error: "Media is temporarily unavailable." }, { status: 503 });
  }
}
export async function HEAD(request: Request, context: { params: Promise<{ key: string }> }) { return GET(request, context); }