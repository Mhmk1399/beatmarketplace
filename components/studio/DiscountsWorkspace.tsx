"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { DashboardPageIntro } from "@/components/dashboard/DashboardPageIntro";
import { DiscountCountdown } from "@/components/discounts/DiscountCountdown";
import { discountNow, synchronizeDiscountClock, useDiscountWindowSignature } from "@/components/discounts/clock";
import { formatPrice } from "@/components/marketplace/MarketplaceProvider";
import { DynamicModal } from "@/components/ui/dynamic/DynamicModal";
import { PlusIcon, TagIcon } from "@/components/ui/icons";
import { NeumorphicButton, NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { apiRequest, controlClass, errorMessage, Field, RequestError } from "@/components/studio/shared";
import { computeDiscountedPrice, discountStatus } from "@/lib/marketplace/discounts";
import type { MarketplaceTrack, ProducerDiscount } from "@/lib/marketplace/types";

const day = 86400000;
function localDateTime(timestamp: number | string) {
  const date = new Date(timestamp);
  const part = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}T${part(date.getHours())}:${part(date.getMinutes())}`;
}

function TrackPicker({ selected, onSelect }: { selected: MarketplaceTrack | null; onSelect: (track: MarketplaceTrack) => void }) {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<MarketplaceTrack[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void apiRequest<{ tracks: MarketplaceTrack[]; total: number; serverTime?: string }>(`/api/tracks?mine=1&pageSize=10&page=${page}&q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((data) => { if (!controller.signal.aborted) { setTracks(data.tracks); setTotal(data.total); setError(""); synchronizeDiscountClock(data.serverTime); } })
        .catch((failure) => { if (!controller.signal.aborted) setError(errorMessage(failure)); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, page]);
  return <fieldset className="space-y-3"><legend className="mb-3 text-sm font-semibold text-secondary">Choose one of your tracks *</legend>
    <label className="sr-only" htmlFor="discount-track-search">Find a track in your catalog</label><input id="discount-track-search" type="search" maxLength={160} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); setLoading(true); }} placeholder="Find a track in your catalog…" className={controlClass} />
    {selected && <p className="text-xs text-accent-text">Selected: {selected.title}</p>}
    <div className="discount-track-picker neo-inset rounded-[var(--radius-control)] p-2" aria-busy={loading}>
      {loading ? <p className="p-4 text-xs text-muted">Finding tracks…</p> : error ? <p role="alert" className="p-4 text-xs text-error-text">{error}</p> : !tracks.length ? <p className="p-4 text-xs text-muted">No tracks match your search.</p> : tracks.map((track) => <label key={track.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm hover:bg-[var(--hover-overlay)]"><input type="radio" name="discount-track" value={track.id} checked={selected?.id === track.id} disabled={track.status === "ARCHIVED"} onChange={() => onSelect(track)} className="size-4 shrink-0 accent-accent" /><span className="min-w-0 flex-1"><strong className="block truncate font-semibold">{track.title}</strong><span className="text-[10px] text-muted">{track.status.toLowerCase()} · {track.licenses.length} active licenses</span></span></label>)}
    </div>
    {total > 10 && <div className="flex items-center justify-between gap-3"><NeumorphicButton size="sm" disabled={page === 1 || loading} onClick={() => { setLoading(true); setPage((value) => value - 1); }}>Previous</NeumorphicButton><span className="text-xs text-muted">Page {page}</span><NeumorphicButton size="sm" disabled={page * 10 >= total || loading} onClick={() => { setLoading(true); setPage((value) => value + 1); }}>Next</NeumorphicButton></div>}
  </fieldset>;
}

function DiscountEditor({ discount, onClose, onSaved }: { discount: ProducerDiscount | null; onClose: () => void; onSaved: () => void }) {
  const [track, setTrack] = useState<MarketplaceTrack | null>(null);
  const [percentage, setPercentage] = useState(discount?.percentage ?? 20);
  const [startsAt, setStartsAt] = useState(() => localDateTime(discount?.startsAt ?? discountNow()));
  const [endsAt, setEndsAt] = useState(() => localDateTime(discount?.endsAt ?? discountNow() + day));
  const [isActive, setIsActive] = useState(discount?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const close = useCallback(() => { if (!saving) onClose(); }, [saving, onClose]);
  const toast = useToast();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const base = track?.licenses.reduce<number | null>((min, license) => min === null ? Number(license.originalPrice ?? license.price) : Math.min(min, Number(license.originalPrice ?? license.price)), null);
  const previewPrice = base && Number.isInteger(percentage) && percentage >= 1 && percentage <= 90 ? computeDiscountedPrice(base, { percentage, isActive: true, startsAt: new Date(0).toISOString(), endsAt: new Date(8640000000000000).toISOString() }) : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const start = Date.parse(startsAt); const end = Date.parse(endsAt);
    if (!discount && !track) { setError("Choose a track before creating your offer."); return; }
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end <= discountNow()) { setError("Choose an end time in the future, after the start time."); return; }
    if (end - start > 90 * day) { setError("An offer can last up to 90 days."); return; }
    setSaving(true);
    try {
      const result = await apiRequest<{ serverTime?: string }>(discount ? `/api/discounts/${discount.id}` : "/api/discounts", { method: discount ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(discount ? { isActive } : { trackId: track!.id }), percentage, startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString() }) });
      synchronizeDiscountClock(result.serverTime);
      toast.success("Offer saved", "The price changes automatically at your chosen start and end times."); onSaved();
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setSaving(false); }
  }

  return <DynamicModal open onClose={close} closeOnBackdrop={!saving} title={discount ? "Edit timed offer" : "Create a timed offer"} description="One offer for one beat. The discount applies to its current license prices and ends automatically." size="lg">
    <form onSubmit={submit} className="space-y-6" aria-busy={saving}><fieldset disabled={saving} className="space-y-6"><legend className="sr-only">Timed offer details</legend>
      {discount ? <div className="neo-inset rounded-[var(--radius-control)] p-4"><p className="text-xs text-muted">Selected track</p><h3 className="mt-2 font-bold">{discount.trackTitle}</h3></div> : <TrackPicker selected={track} onSelect={setTrack} />}
      <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end"><Field label="Discount percentage *" hint="Choose 1–90%. Prices are rounded to whole toman.">{(id) => <input id={id} type="number" inputMode="numeric" min={1} max={90} step={1} required value={percentage} onChange={(event) => setPercentage(Number(event.target.value))} className={controlClass} />}</Field><div className="flex gap-2">{[10,20,30].map((value) => <NeumorphicButton key={value} size="sm" variant={percentage === value ? "accent" : "default"} onClick={() => setPercentage(value)}>{value}%</NeumorphicButton>)}</div></div>
      <div className="grid gap-5 sm:grid-cols-2"><Field label="Starts at *">{(id) => <input id={id} type="datetime-local" required value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className={controlClass} />}</Field><Field label="Ends at *">{(id) => <input id={id} type="datetime-local" required min={startsAt} value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className={controlClass} />}</Field></div>
      <div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-xs text-muted">Duration</span>{[{ days: 1, label: "1 day" },{ days: 3, label: "3 days" },{ days: 7, label: "1 week" }].map((preset) => <NeumorphicButton key={preset.days} size="sm" onClick={() => { const start = Date.parse(startsAt); if (Number.isFinite(start)) setEndsAt(localDateTime(start + preset.days * day)); }}>{preset.label}</NeumorphicButton>)}</div>
      <p className="text-xs leading-6 text-muted">Times use your timezone: <strong className="font-semibold text-secondary">{timezone}</strong>. Offers can run for up to 90 days. A future start time schedules the offer automatically.</p>
      {discount && <label className="neo-inset flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] p-4 text-sm"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="size-4 accent-accent" /><span>Offer enabled</span></label>}
      <div className="discount-editor-summary"><div><p className="text-xs font-semibold">Your offer</p><strong>{percentage || 0}% off</strong></div>{base && previewPrice ? <div className="text-right"><p className="text-xs text-muted">Lowest current license</p><del className="mt-1 block text-xs text-muted">{formatPrice(base)}</del><p className="mt-1 font-bold">{formatPrice(previewPrice)}</p></div> : <p className="max-w-xs text-xs leading-6">The discount applies to each license’s own price. Existing purchases keep their original terms.</p>}</div>
    </fieldset>{error && <RequestError message={error} />}<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><NeumorphicButton disabled={saving} onClick={close}>Cancel</NeumorphicButton><NeumorphicButton type="submit" variant="accent" disabled={saving || (!discount && !track)}>{saving ? "Saving…" : "Save offer"}</NeumorphicButton></div></form>
  </DynamicModal>;
}

export function DiscountsWorkspace() {
  const [discounts, setDiscounts] = useState<ProducerDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editor, setEditor] = useState<{ discount: ProducerDiscount | null } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const toast = useToast();
  useDiscountWindowSignature(discounts);
  const load = useCallback(async (signal?: AbortSignal) => {
    try { const data = await apiRequest<{ discounts: ProducerDiscount[]; total: number; serverTime?: string }>(`/api/discounts?mine=1&page=${page}&pageSize=24`, { signal }); if (!signal?.aborted) { synchronizeDiscountClock(data.serverTime); setDiscounts(data.discounts); setTotal(data.total); setError(""); } }
    catch (failure) { if (!signal?.aborted) setError(errorMessage(failure)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [page]);
  useEffect(() => { const controller = new AbortController(); void Promise.resolve().then(() => { if (!controller.signal.aborted) return load(controller.signal); }); return () => controller.abort(); }, [load]);
  const close = useCallback(() => setEditor(null), []);
  const saved = useCallback(() => { setEditor(null); void load(); }, [load]);
  async function disable(discount: ProducerDiscount) {
    setBusyId(discount.id);
    try { await apiRequest(`/api/discounts/${discount.id}`, { method: "DELETE" }); toast.success("Offer disabled", "New checkouts now use the original license price."); await load(); }
    catch (failure) { toast.error("Could not disable offer", errorMessage(failure)); }
    finally { setBusyId(null); }
  }

  return <div className="space-y-7"><DashboardPageIntro eyebrow="Limited-time offers" title="Give your sound its moment." description="Set a discount for an individual beat, choose its schedule, and let buyers see a live countdown." action={<NeumorphicButton variant="accent" onClick={() => setEditor({ discount: null })}><PlusIcon className="size-4" /> Create offer</NeumorphicButton>} />
    <div className="neo-inset flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-control)] p-5"><p className="max-w-xl text-sm leading-6 text-muted">Original license prices stay intact. Offers change what buyers pay only during the selected window.</p><NeumorphicLink href="/discounts" size="sm">View live offers →</NeumorphicLink></div>
    {loading ? <p role="status" className="text-sm text-muted">Loading your offers…</p> : error ? <RequestError message={error} retry={() => void load()} /> : !discounts.length ? <div className="neo-raised rounded-[var(--radius-card)] p-8 sm:p-12"><TagIcon className="size-10 text-accent-text" /><h2 className="mt-5 text-xl font-bold">A great beat. A reason to come back.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-muted">Choose one of your tracks and give its licenses a timed offer. Buyers see the original price, savings and time left.</p><NeumorphicButton className="mt-6" variant="accent" onClick={() => setEditor({ discount: null })}>Create your first offer</NeumorphicButton></div> : <div className="grid items-start gap-5 xl:grid-cols-2">{discounts.map((discount) => {
      const status = discountStatus(discount, discountNow());
      return <article key={discount.id} className="neo-raised min-w-0 rounded-[var(--radius-card)] p-6"><header className="flex items-start justify-between gap-4"><div className="min-w-0"><h2 className="truncate text-lg font-bold">{discount.trackTitle}</h2><span className="discount-status mt-3" data-status={status}>{status.toLowerCase()}</span></div><strong className="shrink-0 text-3xl font-black tracking-tight text-accent-text">−{discount.percentage}%</strong></header><dl className="mt-5 grid gap-4 sm:grid-cols-2"><div><dt className="text-xs text-muted">Starts</dt><dd className="mt-1 text-xs font-semibold"><time dateTime={discount.startsAt}>{new Date(discount.startsAt).toLocaleString()}</time></dd></div><div><dt className="text-xs text-muted">Ends</dt><dd className="mt-1 text-xs font-semibold"><time dateTime={discount.endsAt}>{new Date(discount.endsAt).toLocaleString()}</time></dd></div></dl>{status === "ACTIVE" && <div className="mt-5"><DiscountCountdown discount={discount} compact /></div>}<div className="mt-5 flex flex-wrap gap-2"><NeumorphicButton size="sm" onClick={() => setEditor({ discount })}>Edit offer</NeumorphicButton>{discount.isActive && status !== "EXPIRED" && <NeumorphicButton size="sm" variant="quiet" disabled={busyId === discount.id} onClick={() => void disable(discount)}>{busyId === discount.id ? "Disabling…" : "Disable"}</NeumorphicButton>}</div></article>;
    })}</div>}
    {(total > 24 || page > 1) && <div className="flex flex-wrap items-center justify-between gap-4"><span className="text-xs text-muted">{total} offers · Page {page}</span><div className="flex gap-3"><NeumorphicButton size="sm" disabled={page === 1 || loading} onClick={() => { setLoading(true); setPage((value) => value - 1); }}>Previous</NeumorphicButton><NeumorphicButton size="sm" disabled={page * 24 >= total || loading} onClick={() => { setLoading(true); setPage((value) => value + 1); }}>Next</NeumorphicButton></div></div>}
    {editor && <DiscountEditor key={editor.discount?.id ?? "new"} discount={editor.discount} onClose={close} onSaved={saved} />}
  </div>;
}
