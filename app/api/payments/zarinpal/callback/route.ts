import { consumeApiQuota } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { paymentConfiguration, verifyPayment } from "@/lib/payments/zarinpal";
import OrderModel from "@/models/Order";
import SoundKitOrderModel from "@/models/SoundKitOrder";

export async function GET(request: Request) {
  let origin: string;
  try {
    origin = paymentConfiguration().origin;
  } catch {
    return NextResponse.json(
      { error: "Payment is not configured." },
      { status: 503 },
    );
  }
  const redirect = (state: string) =>
    NextResponse.redirect(`${origin}/dashboard/orders?payment=${state}`, 303);
  try {
    const url = new URL(request.url);
    const authority = url.searchParams.get("Authority");
    if (!authority || !/^[AS][a-zA-Z0-9]{35}$/.test(authority))
      return redirect("invalid");
    await connectToDatabase();
    await consumeApiQuota("payment-callback", "all", 120, 60_000);
    const order = await OrderModel.findOne({ authority });
    const kitOrder = order
      ? null
      : await SoundKitOrderModel.findOne({ authority });
    const payment = order ?? kitOrder;
    if (!payment) return redirect("invalid");
    if (payment.status === "PAID") return redirect("verified");
    if (url.searchParams.get("Status") !== "OK") return redirect("cancelled");
    if (payment.status !== "PENDING") return redirect("invalid");
    const amount = order ? order.total : kitOrder!.price;
    const referenceId = await verifyPayment(
      authority,
      amount,
      payment.gatewayMode,
    );
    if (order) {
      const update = await OrderModel.updateOne(
        { _id: order._id, status: "PENDING", authority },
        { $set: { status: "PAID", referenceId, paidAt: new Date() } },
      );
      if (
        !update.matchedCount &&
        !(await OrderModel.exists({
          _id: order._id,
          status: "PAID",
          authority,
        }))
      )
        return redirect("unverified");
    } else {
      const update = await SoundKitOrderModel.updateOne(
        { _id: kitOrder!._id, status: "PENDING", authority },
        { $set: { status: "PAID", referenceId, paidAt: new Date() } },
      );
      if (
        !update.matchedCount &&
        !(await SoundKitOrderModel.exists({
          _id: kitOrder!._id,
          status: "PAID",
          authority,
        }))
      )
        return redirect("unverified");
    }
    return redirect("verified");
  } catch {
    return redirect("unverified");
  }
}
