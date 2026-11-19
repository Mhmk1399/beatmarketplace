import { z } from "zod";
import mongoose from "mongoose";
import OrderModel from "@/models/Order";
import UserModel from "@/models/User";
import { cursorFilter, escapeRegex, json, requireUser, resourcePage, workspaceError } from "@/lib/workspace/server";
export async function GET(request: Request) { try {
  const query = z.object({ scope: z.enum(["admin", "producer", "personal"]), q: z.string().trim().max(160).default(""), limit: z.coerce.number().int().min(1).max(50).default(20), cursor: z.string().max(256).optional(), status: z.enum(["PAID","PENDING","CANCELLED"]).optional() }).strict().parse(Object.fromEntries(new URL(request.url).searchParams));
  const auth = await requireUser(request, query.scope === "admin" ? "ADMIN" : query.scope === "producer" ? "PRODUCER" : undefined); if (!auth.ok) return auth.response;
  const producer = query.scope === "producer", filter = query.scope === "admin" ? {} : producer ? { "items.producerId": auth.user._id } : { buyerId: auth.user._id };
  const orders = await OrderModel.find({ ...filter, ...(query.status ? { status: query.status } : {}), ...(query.q ? { "items.title": { $regex: escapeRegex(query.q), $options: "i" } } : {}), ...cursorFilter(query.cursor) }).sort({ createdAt: -1, _id: -1 }).limit(query.limit + 1);
  const result = resourcePage(orders, query.limit), buyers = query.scope === "admin" ? await UserModel.find({ _id: { $in: result.page.map(order => order.buyerId) } }).select("email firstName lastName") : [];
  const names = new Map(buyers.map(user => [String(user._id), { email: user.email, name: `${user.firstName} ${user.lastName}` }]));
  const items = result.page.map(order => { const visible = producer ? order.items.filter(item => item.producerId.equals(new mongoose.Types.ObjectId(auth.user.id))) : order.items; return { id: String(order._id), status: order.status, total: producer ? visible.reduce((sum,item)=>sum+item.price,0) : order.total, gatewayMode: order.gatewayMode, createdAt: order.createdAt.toISOString(), referenceId: query.scope !== "producer" ? order.referenceId : undefined, buyer: query.scope === "admin" ? names.get(String(order.buyerId)) : undefined, items: visible.map((item,index) => ({ title: item.title, licenseTitle: item.licenseTitle, price: item.price, terms: query.scope === "personal" ? item.terms : undefined, downloadUrl: query.scope === "personal" && order.status === "PAID" ? `/api/orders/${order._id}/download?item=${index}` : null })) }; });
  return json({ items, hasMore: result.hasMore, nextCursor: result.nextCursor });
 } catch (error) { return workspaceError(error); } }
