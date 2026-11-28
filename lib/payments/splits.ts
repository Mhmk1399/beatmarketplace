export function splitSale<T>(owner: T, price: number, collaborators: {
  userId: T; status: string; revenueSharePercentage: number;
}[]) {
  const shares = collaborators.filter(item =>
    item.status === "ACCEPTED" && item.revenueSharePercentage > 0,
  ).map(({userId, revenueSharePercentage}) => ({
    userId, amount: Math.floor(price * revenueSharePercentage / 100),
  }));
  const ownerAmount = price - shares.reduce((total, share) => total + share.amount, 0);
  if (ownerAmount < 0) throw new Error("Invalid sale split");
  return [{ userId: owner, amount: ownerAmount }, ...shares];
}

export function producerSaleShare(item: {
  producerId: unknown;
  price: number;
  revenueAllocations?: { userId: unknown; amount: number }[];
}, producerId: unknown) {
  const id = String(producerId);
  if (!item.revenueAllocations)
    return String(item.producerId) === id ? item.price : undefined;
  return item.revenueAllocations.find(share => String(share.userId) === id)?.amount;
}
import type { PipelineStage, Types } from "mongoose";

export function producerAllocationPipeline(id: Types.ObjectId, from: Date): PipelineStage[] {
  return [
    { $match: { status: "PAID", gatewayMode: "live", paidAt: { $gte: from }, $or: [{ "items.producerId": id }, { "items.revenueAllocations.userId": id }] } },
    { $unwind: "$items" },
    { $project: { allocations: { $ifNull: ["$items.revenueAllocations", [{ userId: "$items.producerId", amount: "$items.price" }]] } } },
    { $unwind: "$allocations" },
    { $match: { "allocations.userId": id } },
    { $group: { _id: null, total: { $sum: "$allocations.amount" } } },
  ];
}
