import type mongoose from "mongoose";
import type { SoundKitOrderFields } from "@/models/SoundKitOrder";
export function soundKitOrderAllowsDownload(
  order: Pick<SoundKitOrderFields, "status" | "gatewayMode">,
) {
  return (
    order.status === "PAID" &&
    (order.gatewayMode === "live" ||
      (order.gatewayMode === "sandbox" &&
        process.env.NODE_ENV !== "production"))
  );
}
export function serializeSoundKitOrder(
  order: SoundKitOrderFields & { _id: mongoose.Types.ObjectId },
) {
  return {
    id: String(order._id),
    kitId: String(order.kitId),
    title: order.title,
    price: order.price,
    currency: order.currency,
    status: order.status,
    gatewayMode: order.gatewayMode,
    assetName: order.assetName,
    assetSizeBytes: order.assetSizeBytes,
    referenceId: order.referenceId,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    downloadUrl: soundKitOrderAllowsDownload(order)
      ? `/api/sound-kits/orders/${order._id}/download`
      : null,
  };
}
