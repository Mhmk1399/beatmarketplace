import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest } from "@/lib/auth";
import {
  gatewayOrigin,
  paymentConfiguration,
  requestPayment,
} from "@/lib/payments/zarinpal";
import {
  producerIsPublic,
  marketplaceError,
  MarketplaceError,
} from "@/lib/marketplace/server";
import { objectIdSchema } from "@/lib/marketplace/validation";
import { readSecureJson } from "@/lib/security/request";
import { consumeApiQuota } from "@/lib/security/rate-limit";
import { serializeSoundKitOrder } from "@/lib/sound-kits/orders";
import StudioProductModel from "@/models/StudioProduct";
import SoundKitOrderModel from "@/models/SoundKitOrder";
import { soundKitKey } from "@/lib/sound-kits/crypto";

const inputSchema = z
  .object({
    kitId: objectIdSchema,
    expectedVersion: z.number().int().positive(),
    expectedAssetVersion: z.number().int().positive(),
    expectedPrice: z.number().int().min(1000).max(1_000_000_000),
    idempotencyKey: z.uuid(),
  })
  .strict();
export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.ok) return auth.response;
    const params = new URL(request.url).searchParams;
    const before = objectIdSchema.optional().parse(params.get("before") ?? undefined);
    const orders = await SoundKitOrderModel.find({
      buyerId: auth.user._id,
      ...(params.get("paid") === "1" ? { status: "PAID" } : {}),
      ...(before ? { _id: { $lt: before } } : {}),
    }).sort({ _id: -1 }).limit(26);
    return NextResponse.json(
      { orders: orders.slice(0, 25).map(serializeSoundKitOrder), next: orders.length > 25 ? String(orders[24]._id) : null },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return marketplaceError(error);
  }
}
export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.ok) return auth.response;
    const input = inputSchema.parse(await readSecureJson(request));
    await consumeApiQuota("sound-kit-checkout", auth.user.id, 10, 60_000);
    const config = paymentConfiguration();
    soundKitKey();
    const existing = await SoundKitOrderModel.findOne({
      buyerId: auth.user._id,
      idempotencyKey: input.idempotencyKey,
    });
    if (existing) {
      if (existing.status === "PAID")
        return NextResponse.json({
          order: serializeSoundKitOrder(existing),
          redirectUrl: "/dashboard/orders",
        });
      if (existing.status === "CANCELLED")
        return NextResponse.json({ error: "The previous payment attempt ended. Try again to start a new payment." }, { status: 410 });
      if (!existing.authority)
        throw new MarketplaceError(
          "Your payment is being prepared. Please try again shortly.",
          409,
        );
      return NextResponse.json({
        order: serializeSoundKitOrder(existing),
        paymentUrl: `${gatewayOrigin(existing.gatewayMode)}/pg/StartPay/${existing.authority}`,
      });
    }
    const kit = await StudioProductModel.findOne({
      _id: input.kitId,
      kind: "SOUND_KIT",
      status: "PUBLISHED",
    }).select("+encryptedAsset");
    if (
      !kit?.encryptedAsset ||
      kit.assetVersion < 1 ||
      !kit.priceToman ||
      !kit.assetSizeBytes ||
      !(await producerIsPublic(kit.producerId))
    )
      throw new MarketplaceError("This sound kit is no longer available.", 409);
    if (String(kit.producerId) === auth.user.id)
      throw new MarketplaceError("You already own this sound kit.", 409);
    if (
      kit.version !== input.expectedVersion ||
      kit.assetVersion !== input.expectedAssetVersion ||
      kit.priceToman !== input.expectedPrice
    )
      throw new MarketplaceError(
        "This sound kit changed. Review the current file and price before paying.",
        409,
      );
    const order = new SoundKitOrderModel({
      buyerId: auth.user._id,
      producerId: kit.producerId,
      kitId: kit._id,
      idempotencyKey: input.idempotencyKey,
      title: kit.title,
      price: kit.priceToman,
      currency: "IRT",
      productVersion: kit.version,
      assetVersion: kit.assetVersion,
      assetName: kit.assetName,
      assetSizeBytes: kit.assetSizeBytes,
      encryptedAsset: kit.encryptedAsset,
      status: "PENDING",
      gatewayMode: config.mode,
    });
    await order.save();
    try {
      const payment = await requestPayment(
        String(order._id),
        order.price,
        auth.user.email,
      );
      order.authority = payment.authority;
      await order.save();
      return NextResponse.json(
        { order: serializeSoundKitOrder(order), paymentUrl: payment.url },
        { status: 201 },
      );
    } catch (error) {
      await SoundKitOrderModel.updateOne(
        { _id: order._id, status: "PENDING" },
        { $set: { status: "CANCELLED" } },
      );
      throw error;
    }
  } catch (error) {
    return marketplaceError(error);
  }
}
