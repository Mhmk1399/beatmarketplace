import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { marketplaceError } from "@/lib/marketplace/server";
import { objectIdSchema } from "@/lib/marketplace/validation";
import { serveStoredAsset } from "@/lib/media/storage";
import OrderModel from "@/models/Order";

export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.ok) return auth.response;
    const id = objectIdSchema.parse((await params).id);
    const order = await OrderModel.findOne({ _id: id, buyerId: auth.user._id, status: "PAID" }).select("+items.master");
    const rawIndex = new URL(request.url).searchParams.get("item");
    const index = rawIndex && /^\d{1,2}$/.test(rawIndex) ? Number(rawIndex) : -1;
    const item = order?.items[index];
    if (!item?.master) return NextResponse.json({ error: "Purchased file not found." }, { status: 404 });
    return await serveStoredAsset(request, item.master, { downloadName: item.title });
  } catch (error) { return marketplaceError(error); }
}
export async function HEAD(request: Request, context: { params: Promise<{ id: string }> }) { return GET(request, context); }
