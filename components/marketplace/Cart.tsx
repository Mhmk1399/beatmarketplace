"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatPrice, useMarketplace, type CartItem } from "@/components/marketplace/MarketplaceProvider";
import { DiscountCountdown } from "@/components/discounts/DiscountCountdown";
import { LicensePrice } from "@/components/discounts/LicensePrice";
import { discountNow, synchronizeDiscountClock, useDiscountWindowSignature } from "@/components/discounts/clock";
import { discountIsActive, effectiveLicensePrice } from "@/lib/marketplace/discounts";
import { NeumorphicButton, NeumorphicLink } from "@/components/ui/neumorphic/Button";

function quoteItems(cart: CartItem[], now: number) {
  return cart.map((item) => ({
    trackId: item.track.id,
    contractId: item.license.id,
    expectedPrice: String(effectiveLicensePrice(item.license, now)),
    expectedVersion: item.license.version,
    expectedDiscountVersion: discountIsActive(item.license.discount, now) ? item.license.discount!.version : null,
  }));
}

export function Cart() {
  const { cart, remove } = useMarketplace();
  const { user, status } = useAuth();
  const [acceptedQuote, setAcceptedQuote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [gateway, setGateway] = useState<{ enabled: boolean; sandbox: boolean } | null>(null);
  const checkoutRef = useRef<{ signature: string; key: string } | null>(null);
  // Only start/end boundaries re-render this page; countdown leaves share the one ticking clock.
  useDiscountWindowSignature(cart.map((item) => item.license.discount));
  const items = quoteItems(cart, discountNow());
  const pricingKey = JSON.stringify(items);
  const accepted = acceptedQuote === pricingKey;
  const total = items.reduce((sum, item) => sum + Number(item.expectedPrice), 0);
  const expiredPrice = cart.some((item, index) => Number(item.license.price) !== Number(items[index].expectedPrice));

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/payments/status", { signal: controller.signal }).then(async (response) => {
      const data = await response.json();
      synchronizeDiscountClock(data.serverTime ?? response.headers.get("date"));
      setGateway(data);
    }).catch(() => undefined);
    return () => controller.abort();
  }, []);

  async function checkout() {
    setBusy(true); setError("");
    try {
      const currentItems = quoteItems(cart, discountNow());
      const signature = JSON.stringify(currentItems);
      if (acceptedQuote !== signature) { setAcceptedQuote(""); throw new Error("An offer changed or ended. Review the updated prices and accept the license terms again."); }
      if (checkoutRef.current?.signature !== signature) checkoutRef.current = { signature, key: crypto.randomUUID() };
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: currentItems, idempotencyKey: checkoutRef.current.key, acceptTerms: true }) });
      const data = await response.json();
      if (!response.ok) { if (data.resetCheckout) checkoutRef.current = null; throw new Error(data.error || "Could not start payment."); }
      window.location.assign(data.redirectUrl || data.paymentUrl);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not start payment."); setBusy(false); }
  }

  if (!cart.length) return <div className="neo-inset rounded-[var(--radius-card)] p-10 text-center"><h2 className="text-xl font-bold">Make room for your next idea.</h2><p className="mt-3 text-sm text-muted">Choose a beat and a license to start your cart.</p><NeumorphicLink href="/marketplace" className="mt-6" variant="accent">Explore beats</NeumorphicLink></div>;
  return <div className="grid items-start gap-7 lg:grid-cols-[1.4fr_1fr]">
    <div className="space-y-4">{cart.map((item) => <article key={item.track.id} className="neo-raised rounded-[var(--radius-card)] p-5"><div className="flex flex-wrap items-center gap-4"><div className="min-w-0 flex-1"><Link href={`/tracks/${item.track.id}`} className="block truncate text-lg font-bold hover:text-accent-text">{item.track.title}</Link><p className="mt-1 text-sm text-muted">{item.track.producerName}</p><p className="mt-3 text-xs text-accent-text">{item.license.title} · WAV · License v{item.license.version}</p></div><div className="text-right"><LicensePrice license={item.license} /><NeumorphicButton size="sm" variant="quiet" disabled={busy} onClick={() => remove(item.track.id)}>Remove</NeumorphicButton></div></div>{item.license.discount && <div className="mt-4"><DiscountCountdown discount={item.license.discount} compact /></div>}</article>)}</div>
    <div className="neo-raised-strong space-y-6 rounded-[var(--radius-card)] p-6 sm:p-8"><h2 className="text-xl font-bold">Order summary</h2><div className="flex justify-between text-sm text-muted"><span>{cart.length} {cart.length === 1 ? "license" : "licenses"}</span><span>WAV downloads</span></div><div className="flex flex-wrap justify-between gap-2 border-t border-divider pt-5"><span className="font-bold">Total</span><strong className="text-xl text-accent-text">{formatPrice(total)}</strong></div>
      {expiredPrice && <p role="status" className="rounded-[var(--radius-control)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-warning-text">An offer has ended. The original price is now shown. Please review the updated total before continuing.</p>}
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-muted"><input type="checkbox" checked={accepted} onChange={(event) => setAcceptedQuote(event.target.checked ? pricingKey : "")} disabled={busy} className="mt-1 size-5 shrink-0 accent-accent" /><span>I have reviewed the current prices and license terms for each beat and agree to the listed usage limits.</span></label>
      {total < 1000 && <p className="text-sm leading-6 text-warning-text">The payment gateway requires an order total of at least 1,000 toman.</p>}
      {gateway && !gateway.enabled && <p className="rounded-[var(--radius-control)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-warning-text">Payments are being set up. Your cart is saved on this device so you can return later.</p>}
      {gateway?.sandbox && <p className="text-sm leading-6 text-warning-text">Test gateway: no real payment is collected.</p>}
      {error && <p role="alert" className="text-sm leading-6 text-error-text">{error} <Link href="/marketplace" className="underline">Review current licenses</Link></p>}
      {status === "loading" ? <p className="text-sm text-muted">Checking your session…</p> : !user ? <NeumorphicLink href="/login" variant="accent" className="w-full">Sign in to checkout</NeumorphicLink> : <NeumorphicButton className="w-full" variant="accent" disabled={!accepted || busy || !gateway?.enabled || total < 1000} onClick={() => void checkout()}>{busy ? "Connecting to gateway…" : gateway?.sandbox ? "Continue to test gateway" : "Pay with Zarinpal"}</NeumorphicButton>}
      <p className="text-xs leading-6 text-muted">Complete files unlock after verified payment. The server checks current prices and offer times again before payment starts.</p>
    </div>
  </div>;
}