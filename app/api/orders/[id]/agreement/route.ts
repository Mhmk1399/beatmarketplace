import { authenticateRequest } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/security/request";
import { consumeApiQuota } from "@/lib/security/rate-limit";
import { objectIdSchema } from "@/lib/marketplace/validation";
import { marketplaceError, MarketplaceError } from "@/lib/marketplace/server";
import { orderAllowsDownload } from "@/lib/payments/orders";
import { agreementHtml, type AgreementSnapshot } from "@/lib/licensing/agreement";
import Order from "@/models/Order";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const auth = await authenticateRequest(request); if (!auth.ok) return auth.response;
    await consumeApiQuota("purchased-agreement", auth.user.id, 60, 60_000);
    const id = objectIdSchema.parse((await params).id), url = new URL(request.url);
    const raw = url.searchParams.get("item"), index = raw && /^\d{1,2}$/.test(raw) ? Number(raw) : -1;
    const order = await Order.findOne({ _id: id, buyerId: auth.user._id, status: "PAID" }).select("+items.agreement");
    const item = order?.items[index];
    if (!order || !orderAllowsDownload(order) || !item?.agreement) throw new MarketplaceError("Purchased agreement not found. Older purchases retain their original saved license terms.", 404);
    if (!order.paidAt) throw new MarketplaceError("Payment verification details are unavailable.", 409);
    const snapshot = JSON.parse(item.agreement) as AgreementSnapshot;
    if (snapshot.schemaVersion !== 1) throw new MarketplaceError("Unsupported agreement version.", 409);
    return new Response(agreementHtml(snapshot, id, index, order.paidAt), { headers: {
      "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
      "Referrer-Policy": "no-referrer", "Cross-Origin-Resource-Policy": "same-origin",
      "Content-Disposition": `${url.searchParams.get("download") === "1" ? "attachment" : "inline"}; filename="license-${id}-${index + 1}.html"`,
    } });
  } catch (error) { return marketplaceError(error); }
}
