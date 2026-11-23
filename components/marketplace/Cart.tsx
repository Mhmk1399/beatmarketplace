"use client";

import { LicenseConditions } from "@/components/licensing/LicenseConditions";
import type { MarketplaceLicense } from "@/lib/marketplace/types";
import Link from "next/link";
import { trackHref } from "@/lib/marketplace/track-url";
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
    expectedTermsHash: item.license.termsHash,
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
  const cartKey = JSON.stringify(cart.map(item=>({ trackId:item.track.id, contractId:item.license.id })));
  const [quote, setQuote] = useState<{ key: string; items: { trackId: string; title: string; license: MarketplaceLicense }[] } | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const quoteReady = quote?.key === cartKey && quote.items.length === cart.length;
  const currentCart = cart.map(item=> { const latest = quoteReady ? quote.items.find(q=>q.trackId===item.track.id) : undefined; return latest ? { track: { ...item.track, title: latest.title }, license: latest.license } : item; });
  useEffect(()=>{
    const controller = new AbortController();
    if (cartKey === "[]") return;
    void fetch("/api/orders/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: JSON.parse(cartKey) }), signal: controller.signal, cache: "no-store" })
      .then(async response=>{ const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not load current license terms."); if (!controller.signal.aborted) { synchronizeDiscountClock(data.serverTime); setQuote({ key:cartKey,items:data.items }); setQuoteError(""); } })
      .catch(error=>{ if (!controller.signal.aborted) { setQuote(null); setQuoteError(error instanceof Error ? error.message : "Could not load current license terms."); } });
    return ()=>controller.abort();
  },[cartKey,refresh]);
  // Only start/end boundaries re-render this page; countdown leaves share the one ticking clock.
  useDiscountWindowSignature(currentCart.map((item) => item.license.discount));
  const items = quoteItems(currentCart, discountNow());
  const pricingKey = JSON.stringify(items);
  const accepted = quoteReady && !quoteError && acceptedQuote === pricingKey;
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
      if (!quoteReady || quoteError) throw new Error("Load and review the current license conditions first.");
      const currentItems = quoteItems(currentCart, discountNow());
      const signature = JSON.stringify(currentItems);
      if (acceptedQuote !== signature) { setAcceptedQuote(""); throw new Error("An offer changed or ended. Review the updated prices and accept the license terms again."); }
      if (checkoutRef.current?.signature !== signature) checkoutRef.current = { signature, key: crypto.randomUUID() };
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: currentItems, idempotencyKey: checkoutRef.current.key, acceptTerms: true }) });
      const data = await response.json();
      if (!response.ok) { if (response.status === 409) { setAcceptedQuote(""); setQuote(null); setRefresh(value=>value+1); } if (data.resetCheckout) checkoutRef.current = null; throw new Error(data.error || "Could not start payment."); }
      window.location.assign(data.redirectUrl || data.paymentUrl);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not start payment."); setBusy(false); }
  }

  if (!cart.length) return <div className="neo-inset rounded-[var(--radius-card)] p-10 text-center"><h2 className="text-xl font-bold">Make room for your next idea.</h2><p className="mt-3 text-sm text-muted">Choose a beat and a license to start your cart.</p><NeumorphicLink href="/marketplace" className="mt-6" variant="accent">Explore beats</NeumorphicLink></div>;
  return <div className="grid items-start gap-7 lg:grid-cols-[1.4fr_1fr]">
    <div className="space-y-4">{currentCart.map((item) => <article key={item.track.id} className="neo-raised rounded-[var(--radius-card)] p-5"><div className="flex flex-wrap items-center gap-4"><div className="min-w-0 flex-1"><Link href={trackHref(item.track)} className="block truncate text-lg font-bold hover:text-accent-text">{item.track.title}</Link><p className="mt-1 text-sm text-muted">{item.track.producerName}</p><p className="mt-3 text-xs text-accent-text">{item.license.title} · WAV · License v{item.license.version}</p></div><div className="text-right"><LicensePrice license={item.license} /><NeumorphicButton size="sm" variant="quiet" disabled={busy} onClick={() => remove(item.track.id)}>Remove</NeumorphicButton></div></div>{item.license.discount && <div className="mt-4"><DiscountCountdown discount={item.license.discount} compact /></div>}{quoteReady && <section aria-label={`${item.license.title} license conditions`} className="mt-5 border-t border-divider pt-5"><h3 className="mb-4 font-bold">License conditions</h3><LicenseConditions license={item.license} /></section>}</article>)}</div>
    <div className="neo-raised-strong space-y-6 rounded-[var(--radius-card)] p-6 sm:p-8"><h2 className="text-xl font-bold">Order summary</h2>{!quoteReady && !quoteError && <p role="status" className="text-sm text-muted">Loading current license conditions…</p>}{quoteError && <div role="alert" className="space-y-3 text-sm text-error-text"><p>{quoteError}</p><NeumorphicButton onClick={()=>{setQuoteError("");setRefresh(value=>value+1);}}>Reload conditions</NeumorphicButton></div>}<div className="flex justify-between text-sm text-muted"><span>{cart.length} {cart.length === 1 ? "license" : "licenses"}</span><span>WAV downloads</span></div><div className="flex flex-wrap justify-between gap-2 border-t border-divider pt-5"><span className="font-bold">Total</span><strong className="text-xl text-accent-text">{formatPrice(total)}</strong></div>
      {expiredPrice && <p role="status" className="rounded-[var(--radius-control)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-warning-text">An offer has ended. The original price is now shown. Please review the updated total before continuing.</p>}
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-muted"><input type="checkbox" checked={accepted} onChange={(event) => setAcceptedQuote(event.target.checked ? pricingKey : "")} disabled={busy || !quoteReady || Boolean(quoteError)} className="mt-1 size-5 shrink-0 accent-accent" /><span>I have reviewed the current prices and license terms for each beat and agree to the listed usage limits.</span></label>
      {total < 1000 && <p className="text-sm leading-6 text-warning-text">The payment gateway requires an order total of at least 1,000 toman.</p>}
      {gateway && !gateway.enabled && <p className="rounded-[var(--radius-control)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-warning-text">Payments are being set up. Your cart is saved on this device so you can return later.</p>}
      {gateway?.sandbox && <p className="text-sm leading-6 text-warning-text">Test gateway: no real payment is collected.</p>}
      {error && <p role="alert" className="text-sm leading-6 text-error-text">{error} <Link href="/marketplace" className="underline">Review current licenses</Link></p>}
      {status === "loading" ? <p className="text-sm text-muted">Checking your session…</p> : !user ? <NeumorphicLink href="/login" variant="accent" className="w-full">Sign in to checkout</NeumorphicLink> : <NeumorphicButton className="w-full" variant="accent" disabled={!accepted || busy || !gateway?.enabled || total < 1000} onClick={() => void checkout()}>{busy ? "Connecting to gateway…" : gateway?.sandbox ? "Continue to test gateway" : "Pay with Zarinpal"}</NeumorphicButton>}
      <p className="text-xs leading-6 text-muted">Complete files unlock after verified payment. The server checks current prices and offer times again before payment starts.</p>
    </div>
  </div>;
}
