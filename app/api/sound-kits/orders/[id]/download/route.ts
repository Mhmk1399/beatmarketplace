import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { marketplaceError } from "@/lib/marketplace/server";
import { objectIdSchema } from "@/lib/marketplace/validation";
import { readStoredAsset } from "@/lib/media/storage";
import { decryptSoundKit } from "@/lib/sound-kits/crypto";
import { soundKitOrderAllowsDownload } from "@/lib/sound-kits/orders";
import { requireSameOrigin } from "@/lib/security/request";
import { consumeApiQuota } from "@/lib/security/rate-limit";
import SoundKitOrderModel from "@/models/SoundKitOrder";

export const runtime = "nodejs";
function downloadName(value: string) {
  const safe = value.replace(/[\r\n"\\/]/g, "_").slice(0, 180);
  return safe.toLowerCase().endsWith(".zip") ? safe : `${safe}.zip`;
}
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const auth = await authenticateRequest(request);
    if (!auth.ok) return auth.response;
    await consumeApiQuota("sound-kit-download", auth.user.id, 30, 60_000);
    const id = objectIdSchema.parse((await params).id);
    const order = await SoundKitOrderModel.findOne({
      _id: id,
      buyerId: auth.user._id,
      status: "PAID",
    }).select("+encryptedAsset");
    if (!order?.encryptedAsset || !soundKitOrderAllowsDownload(order))
      return NextResponse.json(
        { error: "Purchased sound kit not found." },
        { status: 404 },
      );
    const encrypted = await readStoredAsset(
      order.encryptedAsset.key,
      order.encryptedAsset,
    );
    const plain = decryptSoundKit(encrypted);
    const name = downloadName(order.assetName);
    return new NextResponse(plain, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Length": String(plain.length),
        "Content-Disposition": `attachment; filename="sound-kit.zip"; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return marketplaceError(error);
  }
}
