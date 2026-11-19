import mongoose from "mongoose";
import { z } from "zod";
import UserModel from "@/models/User";
import TrackModel from "@/models/Track";
import OrderModel from "@/models/Order";
import FavoriteModel from "@/models/Favorite";
import ContractModel from "@/models/Contract";
import ContactMessageModel from "@/models/ContactMessage";
import { json, requireUser, workspaceError } from "@/lib/workspace/server";
export async function GET(request: Request) { try {
  const query = z.object({ workspace: z.enum(["admin", "producer", "personal"]), days: z.coerce.number().int().min(7).max(90).default(30) }).strict().parse(Object.fromEntries(new URL(request.url).searchParams));
  const auth = await requireUser(request, query.workspace === "admin" ? "ADMIN" : query.workspace === "producer" ? "PRODUCER" : undefined); if (!auth.ok) return auth.response;
  const id = new mongoose.Types.ObjectId(auth.user.id), from = new Date(); from.setUTCHours(0,0,0,0); from.setUTCDate(from.getUTCDate() - query.days);
  const isAdmin = query.workspace === "admin", isProducer = query.workspace === "producer";
  const orderMatch = isAdmin ? {} : isProducer ? { "items.producerId": id } : { buyerId: id };
  const moneyPipeline: mongoose.PipelineStage[] = [{ $match: { ...orderMatch, status: "PAID", gatewayMode: "live" } }, ...(isProducer ? [{ $unwind: "$items" }, { $match: { "items.producerId": id } }] as mongoose.PipelineStage[] : []), { $group: { _id: null, total: { $sum: isProducer ? "$items.price" : "$total" }, count: { $sum: 1 } } }];
  const dailyPipeline: mongoose.PipelineStage[] = [{ $match: { ...orderMatch, status: "PAID", gatewayMode: "live", paidAt: { $gte: from } } }, ...(isProducer ? [{ $unwind: "$items" }, { $match: { "items.producerId": id } }] as mongoose.PipelineStage[] : []), { $group: { _id: { $dateToString: { date: "$paidAt", format: "%Y-%m-%d", timezone: "Asia/Tehran" } }, total: { $sum: isProducer ? "$items.price" : "$total" } } }, { $sort: { _id: 1 } }];
  const [money, daily, orders, countA, countB, countC, recent] = await Promise.all([
    OrderModel.aggregate(moneyPipeline).option({ maxTimeMS: 10000 }), OrderModel.aggregate(dailyPipeline).option({ maxTimeMS: 10000 }), OrderModel.countDocuments({ ...orderMatch, status: "PAID", gatewayMode: "live" }),
    isAdmin ? UserModel.countDocuments({ status: "ACTIVE" }) : isProducer ? TrackModel.countDocuments({ producerId: id, status: { $ne: "ARCHIVED" } }) : OrderModel.aggregate([{ $match: { buyerId: id, status: "PAID" } }, { $unwind: "$items" }, { $count: "count" }]),
    isAdmin ? TrackModel.countDocuments({ status: { $ne: "ARCHIVED" } }) : isProducer ? TrackModel.countDocuments({ producerId: id, status: "PUBLISHED", visibility: "PUBLIC" }) : FavoriteModel.countDocuments({ userId: id }),
    isAdmin ? ContactMessageModel.countDocuments({ status: "NEW" }) : isProducer ? ContractModel.countDocuments({ producerId: id, isActive: true }) : UserModel.countDocuments({ _id: id, isEmailVerified: true }),
    isAdmin ? ContactMessageModel.find({}).sort({ createdAt: -1, _id: -1 }).limit(5).select("name subject status createdAt") : isProducer ? TrackModel.find({ producerId: id }).sort({ createdAt: -1 }).limit(5).select("title status createdAt") : OrderModel.find({ buyerId: id }).sort({ createdAt: -1 }).limit(5).select("status items.title createdAt"),
  ]);
  const amount = Number(money[0]?.total ?? 0), first = Array.isArray(countA) ? Number(countA[0]?.count ?? 0) : countA;
  const stats = isAdmin ? [{ label: "Active users", value: first, href: "/admin/users", icon: "users" }, { label: "Beats in catalog", value: countB, href: "/admin/beats", icon: "tracks" }, { label: "Verified sales", value: orders, href: "/admin/orders", icon: "contracts" }, { label: "Live sales volume", value: amount, money: true, href: "/admin/orders", icon: "store" }] : isProducer ? [{ label: "My beats", value: first, href: "/studio/tracks", icon: "tracks" }, { label: "Published beats", value: countB, href: "/studio/tracks", icon: "store" }, { label: "Verified sales", value: orders, href: "/studio/sales", icon: "contracts" }, { label: "Gross sales", value: amount, money: true, href: "/studio/sales", icon: "store" }] : [{ label: "Purchased beats", value: first, href: "/dashboard/orders", icon: "tracks" }, { label: "Favorites", value: countB, href: "/dashboard/favorites", icon: "tracks" }, { label: "Verified orders", value: orders, href: "/dashboard/orders", icon: "contracts" }, { label: "Total spent", value: amount, money: true, href: "/dashboard/orders", icon: "store" }];
  const activity = recent.map(record => { const value = record.toObject() as unknown as { _id: unknown; title?: string; name?: string; status: string; subject?: string; items?: { title: string }[]; createdAt: Date }; return { id: String(value._id), title: value.title ?? value.name ?? value.items?.[0]?.title ?? "Order", detail: value.subject ?? value.status, createdAt: value.createdAt.toISOString() }; });
  return json({ stats, daily: daily.map(row => ({ date: row._id, total: row.total })), activity, period: query.days, inboxNew: isAdmin ? countC : undefined, activeLicenses: isProducer ? countC : undefined });
 } catch (error) { return workspaceError(error); } }
