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
import { CoverImage } from "@/components/ui/CoverImage";
import { ScrollingTitle } from "@/components/ui/dynamic/ScrollingTitle";
import { ArrowRightIcon, CartIcon, ChevronDownIcon, FileTextIcon, ShieldIcon, TrashIcon } from "@/components/ui/icons";
import { PlayerPauseIcon, PlayerPlayIcon } from "@/components/audio/PlayerIcons";
import styles from "./Cart.module.css";

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

function CartLineItem({ item, busy, quoteReady }: { item: CartItem; busy: boolean; quoteReady: boolean }) {
  const { remove, toggle, track, playing } = useMarketplace();
  const isPlaying = track?.id === item.track.id && playing;
  return <article className={`${styles.item} neo-raised`} aria-label={item.track.title}>
    <div className={styles.itemMain}>
      <div className={styles.cover}>
        <CoverImage src={item.track.artworkUrl || ""} alt="" sizes="(max-width: 599px) 72px, 96px" />
        {item.track.previewUrl && <NeumorphicButton
          variant="accent"
          className={styles.preview}
          aria-label={`${isPlaying ? "Pause" : "Play"} ${item.track.title} preview`}
          aria-pressed={isPlaying}
          disabled={busy}
          onClick={() => toggle(item.track)}
        >{isPlaying ? <PlayerPauseIcon /> : <PlayerPlayIcon />}</NeumorphicButton>}
      </div>
      <div className={styles.itemCopy}>
        <h3><Link href={trackHref(item.track)} prefetch={false}><ScrollingTitle text={item.track.title} /></Link></h3>
        <p className={styles.producer}>{item.track.producerName}</p>
        <p className={styles.license}><FileTextIcon /><span>{item.license.title}</span></p>
        <p className={styles.format}>{item.license.formats.join(" + ")} <span aria-hidden="true">·</span> License v{item.license.version}</p>
      </div>
      <div className={styles.itemPrice}><LicensePrice license={item.license} /></div>
      <NeumorphicButton
        className={styles.remove}
        disabled={busy}
        aria-label={`Remove ${item.track.title} from cart`}
        title="Remove from cart"
        onClick={() => remove(item.track.id)}
      ><TrashIcon /></NeumorphicButton>
    </div>
    {item.license.discount && <div className={styles.offer}><DiscountCountdown discount={item.license.discount} compact /></div>}
    {quoteReady && <details className={styles.conditions}>
      <summary><span><FileTextIcon />Review license conditions</span><ChevronDownIcon /></summary>
      <div className={styles.conditionsBody}><LicenseConditions license={item.license} /></div>
    </details>}
  </article>;
}

export function Cart() {
  const { cart } = useMarketplace();
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
  const subtotal = currentCart.reduce((sum, item) => sum + Number(item.license.originalPrice ?? item.license.price), 0);
  const savings = Math.max(0, subtotal - total);
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
    if (busy) return;
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

  if (!cart.length) return <section className={`${styles.empty} neo-raised`} aria-labelledby="empty-cart-title">
    <span className={`${styles.emptyIcon} neo-inset`} aria-hidden="true"><CartIcon /></span>
    <p className={styles.eyebrow}>A fresh start</p>
    <h2 id="empty-cart-title">Your next sound is out there.</h2>
    <p>Find a beat you love, choose your license, and make it yours.</p>
    <NeumorphicLink href="/marketplace" variant="accent">Explore beats<ArrowRightIcon className="size-4" /></NeumorphicLink>
  </section>;
  return <div className={styles.layout}>
    <section className={styles.selection} aria-labelledby="cart-selection-title">
      <div className={styles.selectionHeading}><h2 id="cart-selection-title">Your selection</h2><span>{cart.length} {cart.length === 1 ? "beat" : "beats"}</span></div>
      <ul className={styles.items}>{currentCart.map(item => <li key={item.track.id}><CartLineItem item={item} busy={busy} quoteReady={quoteReady} /></li>)}</ul>
      <p className={styles.savedNote}>Your cart is saved on this device. Keep exploring whenever inspiration strikes.</p>
    </section>
    <aside className={`${styles.summary} neo-raised-strong`} aria-labelledby="cart-summary-title">
      <div className={styles.summaryHeading}><span className={`${styles.summaryIcon} neo-inset`} aria-hidden="true"><CartIcon /></span><div><p className={styles.eyebrow}>The next step</p><h2 id="cart-summary-title">Order summary</h2></div></div>
      {!quoteReady && !quoteError && <p role="status" className={styles.loading}><span aria-hidden="true" />Checking current prices and license terms…</p>}
      {quoteError && <div role="alert" className={styles.error}><p>{quoteError}</p><NeumorphicButton size="sm" onClick={() => { setQuoteError(""); setRefresh(value => value + 1); }}>Reload conditions</NeumorphicButton></div>}
      <dl className={styles.breakdown}>
        <div><dt>Licenses <span>({cart.length})</span></dt><dd>{formatPrice(subtotal)}</dd></div>
        {savings > 0 && <div className={styles.savings}><dt>You save</dt><dd>−{formatPrice(savings)}</dd></div>}
        <div className={styles.total}><dt>Total <small>{quoteReady && !quoteError ? "Current price" : "Awaiting confirmation"}</small></dt><dd>{formatPrice(total)}</dd></div>
      </dl>
      {expiredPrice && <p role="status" className={styles.notice}>Prices have changed. Review the updated total and license terms before continuing.</p>}
      <label className={`${styles.acceptance} neo-inset`}>
        <input type="checkbox" checked={accepted} onChange={event => setAcceptedQuote(event.target.checked ? pricingKey : "")} disabled={busy || !quoteReady || Boolean(quoteError)} />
        <span>I agree to the current prices and license conditions for every beat in my cart.</span>
      </label>
      {total < 1000 && <p className={styles.notice}>The payment gateway requires an order total of at least 1,000 toman.</p>}
      {gateway && !gateway.enabled && <p className={styles.notice}>Payments are being set up. Your cart is saved on this device so you can return later.</p>}
      {gateway?.sandbox && <p className={styles.notice}>Test gateway: no real payment is collected.</p>}
      {error && <div role="alert" className={styles.error}><p>{error}</p><Link href="/marketplace">Review current licenses</Link></div>}
      {status === "loading" ? <p role="status" className={styles.savedNote}>Checking your session…</p> : !user ? <NeumorphicLink href="/login" variant="accent" className={styles.checkout}>Sign in to checkout<ArrowRightIcon /></NeumorphicLink> : <NeumorphicButton className={styles.checkout} variant="accent" disabled={!accepted || busy || !gateway?.enabled || total < 1000} onClick={() => void checkout()} aria-busy={busy}>{busy ? "Connecting to gateway…" : gateway?.sandbox ? "Continue to test gateway" : "Pay with Zarinpal"}<ArrowRightIcon /></NeumorphicButton>}
      <p className={styles.paymentNote}><ShieldIcon /><span>Full files unlock after verified payment. Prices and offer times are checked again before checkout.</span></p>
    </aside>
  </div>;
}
