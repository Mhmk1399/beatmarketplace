// Protocol: https://www.zarinpal.com/docs/paymentGateway/connectToGateway
export class PaymentError extends Error { status: number; constructor(message: string, status = 502) { super(message); this.status = status; } }
export function paymentConfiguration() {
  const merchantId = process.env.ZARINPAL_MERCHANT_ID;
  const appUrl = process.env.APP_URL;
  if (!merchantId || !/^[a-f0-9-]{36}$/i.test(merchantId) || !appUrl) throw new PaymentError("Payment is not configured yet. Please return later.", 503);
  const origin = new URL(appUrl).origin;
  if (process.env.NODE_ENV === "production" && !origin.startsWith("https://")) throw new PaymentError("The payment return URL must use HTTPS.", 503);
  const mode = process.env.ZARINPAL_SANDBOX === "true" ? "sandbox" as const : "live" as const;
  return { merchantId, origin, mode };
}
export function gatewayOrigin(mode: "sandbox" | "live") { return mode === "sandbox" ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com"; }
type GatewayData = { code?: number; authority?: string; ref_id?: string | number };
async function gatewayCall(method: "request" | "verify", data: Record<string, unknown>, mode: "sandbox" | "live"): Promise<GatewayData> {
  const response = await fetch(`${gatewayOrigin(mode)}/pg/v4/payment/${method}.json`, {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data), signal: AbortSignal.timeout(15_000), cache: "no-store",
  });
  if (!response.ok) throw new PaymentError("The payment gateway could not be reached. Please try again.");
  const result = await response.json() as { data?: GatewayData };
  if (!result.data) throw new PaymentError("The payment gateway returned an invalid response.");
  return result.data;
}
export async function requestPayment(orderId: string, amount: number, email: string) {
  const config = paymentConfiguration();
  const data = await gatewayCall("request", { merchant_id: config.merchantId, amount, currency: "IRT", callback_url: `${config.origin}/api/payments/zarinpal/callback`,
    description: `BeatMarketplace order ${orderId}`, metadata: { email, order_id: orderId } }, config.mode);
  if (data.code !== 100 || !data.authority || !/^[AS][a-zA-Z0-9]{35}$/.test(data.authority)) throw new PaymentError("The gateway did not accept this payment. Please try again.");
  return { authority: data.authority, url: `${gatewayOrigin(config.mode)}/pg/StartPay/${data.authority}`, mode: config.mode };
}
export async function verifyPayment(authority: string, amount: number, mode: "sandbox" | "live") {
  const config = paymentConfiguration();
  const data = await gatewayCall("verify", { merchant_id: config.merchantId, authority, amount }, mode);
  // 101 permits recovery if the gateway verified but our database write was interrupted.
  if (![100, 101].includes(data.code ?? 0) || !data.ref_id) throw new PaymentError("Payment has not been verified. No download has been unlocked.", 409);
  return String(data.ref_id);
}
