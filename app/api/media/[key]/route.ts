import { consumeApiQuota } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { MediaValidationError, serveStoredAsset } from "@/lib/media/storage";
import TrackModel from "@/models/Track";
import { producerIsPublic } from "@/lib/marketplace/server";
import { previewUrl, artworkUrl } from "@/lib/media/policy";
import { requireSameOrigin, securityErrorResponse } from "@/lib/security/request";
import { previewCdnUrl } from "@/lib/media/preview-cdn";

export const runtime = "nodejs";
const notFound = () => new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" } });
export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    if (!/^[0-9a-f-]{36}\.(preview\.(mp3|wav)|artwork\.(png|jpg|webp))$/.test(key)) return notFound();
    if (key.includes(".preview.")) requireSameOrigin(request);
    const quality = new URL(request.url).searchParams.get("quality");
    if (quality && !["low", "standard"].includes(quality)) throw new MediaValidationError("Unknown audio quality.");
    await consumeApiQuota("public-media", "all", 3000, 60_000);
    await connectToDatabase();
    const track = await TrackModel.findOne({ $or: [{ "audio.preview.key": key }, { "artwork.key": key }] }).select("producerId status visibility audio.preview artwork");
    if (!track) return notFound();
    const isPublic = track.status === "PUBLISHED" && track.visibility === "PUBLIC" && await producerIsPublic(track.producerId);
    if (!isPublic) {
      const auth = await authenticateRequest(request);
      if (!auth.ok || (auth.user.id !== String(track.producerId) && !auth.user.roles.includes("ADMIN"))) return notFound();
    }
    const asset = track.audio.preview?.key === key ? track.audio.preview : track.artwork;
    if (!asset || !(track.audio.preview?.key === key ? previewUrl(asset) : artworkUrl(asset))) return notFound();
    if (isPublic && track.audio.preview?.key === key && quality !== "low") {
      const cdn = previewCdnUrl(asset);
      if (cdn) return new Response(null, { status: 307, headers: { Location: cdn, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
    }
    return await serveStoredAsset(request, asset);
  } catch (error) {
    const secured = securityErrorResponse(error);
    if (secured) return secured;
    if ((error instanceof MediaValidationError && error.status === 404) || (error instanceof Error && "code" in error && error.code === "ENOENT")) return notFound();
    if (error instanceof MediaValidationError && [400, 413, 429].includes(error.status)) return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "private, no-store", ...(error.status === 429 ? { "Retry-After": "10" } : {}) } });
    return NextResponse.json({ error: "Media is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
export async function HEAD(request: Request, context: { params: Promise<{ key: string }> }) { return GET(request, context); }
