import { NextResponse } from "next/server";
import { paymentConfiguration } from "@/lib/payments/zarinpal";
export async function GET() {
  const serverTime = new Date().toISOString();
  const headers = { "Cache-Control": "private, no-store" };
  try { const config = paymentConfiguration(); return NextResponse.json({ enabled: true, sandbox: config.mode === "sandbox", serverTime }, { headers }); }
  catch { return NextResponse.json({ enabled: false, sandbox: false, serverTime }, { headers }); }
}
