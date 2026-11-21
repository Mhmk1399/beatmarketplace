import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest } from "@/lib/auth";
import { activeContractFilter, marketplaceError, MarketplaceError, producerIsPublic, publicTrackFilter } from "@/lib/marketplace/server";
import { objectIdSchema } from "@/lib/marketplace/validation";
import { gatewayOrigin, paymentConfiguration, requestPayment } from "@/lib/payments/zarinpal";
import ContractModel from "@/models/Contract";
import OrderModel, { type OrderItem } from "@/models/Order";
import { serializeOrder } from "@/lib/payments/orders";
import TrackModel from "@/models/Track";
import TrackDiscountModel from "@/models/TrackDiscount";
import { activeDiscountFilter, serializeDiscount } from "@/lib/marketplace/discount-server";
import { computeDiscountedPrice } from "@/lib/marketplace/discounts";
import { readSecureJson, securityErrorResponse } from "@/lib/security/request";
import { consumeApiQuota } from "@/lib/security/rate-limit";

const inputSchema = z.object({ idempotencyKey: z.uuid(), items: z.array(z.object({ trackId: objectIdSchema, contractId: objectIdSchema, expectedPrice: z.string().regex(/^\d+$/), expectedVersion: z.number().int().positive(), expectedDiscountVersion: z.number().int().positive().nullable().optional() }).strict()).min(1).max(20), acceptTerms: z.literal(true) }).strict()
  .refine((value) => new Set(value.items.map((item) => item.trackId)).size === value.items.length, "Choose one license per track.");

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.ok) return auth.response;
    const orders = await OrderModel.find({ buyerId: auth.user._id }).sort({ createdAt: -1 }).limit(100);
    return NextResponse.json({ orders: orders.map(serializeOrder) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return marketplaceError(error); }
}
export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.ok) return auth.response;
    const input = inputSchema.parse(await readSecureJson(request));
    await consumeApiQuota("checkout", auth.user.id, 10, 60_000);
    const config = paymentConfiguration();
    const existing = await OrderModel.findOne({ buyerId: auth.user._id, idempotencyKey: input.idempotencyKey });
    if (existing) {
      if (existing.status === "PAID") return NextResponse.json({ order: serializeOrder(existing), redirectUrl: "/dashboard/orders" });
      if (existing.status === "CANCELLED") return NextResponse.json({ error: "The previous payment attempt ended. Try again to start a new payment.", resetCheckout: true }, { status: 409 });
      if (!existing.authority) throw new MarketplaceError("Your payment is being prepared. Please try again shortly.", 409);
      return NextResponse.json({ order: serializeOrder(existing), paymentUrl: `${gatewayOrigin(existing.gatewayMode)}/pg/StartPay/${existing.authority}` });
    }
    const quoteTime = new Date();
    const discounts = await TrackDiscountModel.find({ trackId: { $in: input.items.map((item) => item.trackId) }, ...activeDiscountFilter(quoteTime) });
    const discountsByTrack = new Map(discounts.map((discount) => [String(discount.trackId), discount]));
    const items: OrderItem[] = [];
    for (const requested of input.items) {
      const track = await TrackModel.findOne({ _id: requested.trackId, ...publicTrackFilter }).select("+audio.master");
      if (!track || !track.audio.master || !await producerIsPublic(track.producerId)) throw new MarketplaceError("A track in your cart is no longer available.", 409);
      if (String(track.producerId) === auth.user.id) throw new MarketplaceError("You already own this track.");
      const contract = await ContractModel.findOne({ _id: requested.contractId, producerId: track.producerId, trackIds: track._id, ...activeContractFilter(quoteTime) });
      if (!contract) throw new MarketplaceError("A license changed. Refresh your cart before paying.", 409);
      if (contract.terms.licenseType !== "NON_EXCLUSIVE") throw new MarketplaceError("Exclusive licenses require a producer agreement and are not available through this checkout.", 409);
      if (contract.filesToDeliver.some((file) => file.format !== "WAV")) throw new MarketplaceError("This license requires files that are not available for delivery.", 409);
      const originalPrice = Number(contract.price.toString());
      if (!Number.isSafeInteger(originalPrice) || originalPrice < 1000 || originalPrice > 1_000_000_000) throw new MarketplaceError("This license has an invalid toman price.", 409);
      const candidate = discountsByTrack.get(String(track._id));
      const discount = candidate && String(candidate.producerId) === String(track.producerId) ? serializeDiscount(candidate) : null;
      const price = computeDiscountedPrice(originalPrice, discount, quoteTime);
      if (contract.version !== requested.expectedVersion || String(price) !== requested.expectedPrice ||
          (requested.expectedDiscountVersion !== undefined && requested.expectedDiscountVersion !== (discount?.version ?? null))) {
        throw new MarketplaceError("A license, price or promotion changed. Review the current price and add the license to your cart again before paying.", 409);
      }
      items.push({ trackId: track._id, producerId: track.producerId, title: track.title, contractId: contract._id, contractVersion: contract.version,
        licenseTitle: contract.title, price, originalPrice, discountAmount: originalPrice - price,
        discount: discount ? { id: discount.id, percentage: discount.percentage, version: discount.version, startsAt: new Date(discount.startsAt), endsAt: new Date(discount.endsAt) } : undefined,
        terms: JSON.stringify({ title: contract.title, version: contract.version, description: contract.description, terms: contract.terms, territory: contract.territory, filesToDeliver: contract.filesToDeliver }),
        master: track.audio.master });
    }
    const total = items.reduce((sum, item) => sum + item.price, 0);
    if (total < 1000) throw new MarketplaceError("The minimum gateway payment is 1,000 toman. Add another licensed track to complete this order.");
    const order = await OrderModel.create({ buyerId: auth.user._id, idempotencyKey: input.idempotencyKey, items, total, currency: "IRT", status: "PENDING", gatewayMode: config.mode });
    try {
      const payment = await requestPayment(String(order._id), total, auth.user.email);
      order.authority = payment.authority;
      await order.save();
      return NextResponse.json({ order: serializeOrder(order), paymentUrl: payment.url }, { status: 201 });
    } catch (error) {
      await OrderModel.updateOne({ _id: order._id, status: "PENDING" }, { $set: { status: "CANCELLED" } });
      throw error;
    }
  } catch (error) {
    const secured = securityErrorResponse(error);
    if (secured) return secured;
    if (error instanceof Error && "status" in error && typeof error.status === "number") return NextResponse.json({ error: error.message }, { status: error.status });
    return marketplaceError(error);
  }
}
