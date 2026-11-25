import { orderAllowsDownload } from "@/lib/payments/orders";
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { marketplaceError } from "@/lib/marketplace/server";
import { objectIdSchema } from "@/lib/marketplace/validation";
import { readStoredAsset, serveStoredAsset } from "@/lib/media/storage";
import { decryptSoundKit } from "@/lib/sound-kits/crypto";
import OrderModel from "@/models/Order";
import { requireSameOrigin } from "@/lib/security/request";
import { consumeApiQuota } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const auth = await authenticateRequest(request);
    if (!auth.ok) return auth.response;
    await consumeApiQuota("purchased-download", auth.user.id, 60, 60_000);
    const id = objectIdSchema.parse((await params).id);
    const order = await OrderModel.findOne({
      _id: id,
      buyerId: auth.user._id,
      status: "PAID",
    }).select("+items.master +items.deliverables");
    const rawIndex = new URL(request.url).searchParams.get("item");
    const index =
      rawIndex && /^\d{1,2}$/.test(rawIndex) ? Number(rawIndex) : -1;
    const item = order?.items[index];
    if (!order || !orderAllowsDownload(order) || !item)
      return NextResponse.json(
        { error: "Purchased file not found." },
        { status: 404 },
      );
    const requested = new URL(request.url).searchParams
      .get("format")
      ?.toUpperCase();
    const deliverable = requested
      ? item.deliverables?.find((file) => file.format === requested)
      : item.deliverables?.find((file) => file.format === "WAV");
    const modern = Boolean(item.deliverables?.length);
    const asset = modern
      ? deliverable?.asset
      : !requested || requested === "WAV"
        ? item.master
        : null;
    if (!asset)
      return NextResponse.json(
        { error: "Purchased file not found." },
        { status: 404 },
      );
    if (!asset.key.endsWith(".enc"))
      return await serveStoredAsset(request, asset, {
        downloadName: item.title,
        privateDownload: true,
      });
    const plain = decryptSoundKit(
      await readStoredAsset(asset.key, asset, 105 * 1024 * 1024),
    );
    const format = deliverable?.format ?? "WAV",
      extension = format === "STEMS" ? "zip" : format.toLowerCase(),
      mime =
        format === "WAV"
          ? "audio/wav"
          : format === "MP3"
            ? "audio/mpeg"
            : "application/zip";
    return new NextResponse(plain, {
      headers: {
        "Content-Type": mime,
        "Content-Length": String(plain.length),
        "Content-Disposition": `attachment; filename="purchased-beat.${extension}"; filename*=UTF-8''${encodeURIComponent(deliverable?.name ?? `${item.title}.${extension}`)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return marketplaceError(error);
  }
}
export async function HEAD(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return GET(request, context);
}
