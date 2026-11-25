import type mongoose from "mongoose";
import type { OrderFields } from "@/models/Order";

/** Test payments never grant original-file entitlements on a production server. */
export function orderAllowsDownload(order: Pick<OrderFields, "status" | "gatewayMode">) {
  return order.status === "PAID" && (order.gatewayMode === "live" || (order.gatewayMode === "sandbox" && process.env.NODE_ENV !== "production"));
}

export function serializeOrder(order: OrderFields & { _id: mongoose.Types.ObjectId }) {
  return { id: String(order._id), total: order.total, currency: order.currency, status: order.status, referenceId: order.referenceId,
    gatewayMode: order.gatewayMode, createdAt: order.createdAt, paidAt: order.paidAt,
    items: order.items.map((item, index) => ({ trackId: String(item.trackId), title: item.title, licenseTitle: item.licenseTitle, price: item.price,
      originalPrice: item.originalPrice ?? item.price, discountAmount: item.discountAmount ?? 0,
      discount: item.discount ? { id: item.discount.id, percentage: item.discount.percentage, version: item.discount.version, startsAt: item.discount.startsAt, endsAt: item.discount.endsAt } : null,
      contractVersion: item.contractVersion, terms: item.terms, agreementUrl: item.agreementVersion === 1 && orderAllowsDownload(order) ? `/api/orders/${order._id}/agreement?item=${index}` : null, downloadUrl: orderAllowsDownload(order) ? `/api/orders/${order._id}/download?item=${index}` : null,
      downloads: orderAllowsDownload(order) ? (item.deliverables?.length ? item.deliverables.map(file => ({ format: file.format, url: `/api/orders/${order._id}/download?item=${index}&format=${file.format}` })) : [{ format: "WAV", url: `/api/orders/${order._id}/download?item=${index}` }]) : [] })) };
}
