import type mongoose from "mongoose";
import type { OrderFields } from "@/models/Order";

export function serializeOrder(order: OrderFields & { _id: mongoose.Types.ObjectId }) {
  return { id: String(order._id), total: order.total, currency: order.currency, status: order.status, referenceId: order.referenceId,
    gatewayMode: order.gatewayMode, createdAt: order.createdAt, paidAt: order.paidAt,
    items: order.items.map((item, index) => ({ trackId: String(item.trackId), title: item.title, licenseTitle: item.licenseTitle, price: item.price,
      originalPrice: item.originalPrice ?? item.price, discountAmount: item.discountAmount ?? 0,
      discount: item.discount ? { id: item.discount.id, percentage: item.discount.percentage, version: item.discount.version, startsAt: item.discount.startsAt, endsAt: item.discount.endsAt } : null,
      contractVersion: item.contractVersion, terms: item.terms, downloadUrl: order.status === "PAID" ? `/api/orders/${order._id}/download?item=${index}` : null })) };
}
