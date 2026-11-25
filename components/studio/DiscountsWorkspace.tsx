"use client";

import { formatPersianDateTime } from "@/lib/date-time";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ResourceManager, type ResourceConfig } from "@/components/admin/ResourceManager";
import { DiscountCountdown } from "@/components/discounts/DiscountCountdown";
import { discountNow, synchronizeDiscountClock, useDiscountWindowSignature } from "@/components/discounts/clock";
import { formatPrice } from "@/components/marketplace/MarketplaceProvider";
import { DynamicModal } from "@/components/ui/dynamic/DynamicModal";
import { DynamicDateTimePicker } from "@/components/ui/dynamic/DynamicDateTimePicker";

import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { apiRequest, controlClass, errorMessage, Field, RequestError } from "@/components/studio/shared";
import { computeDiscountedPrice, discountStatus } from "@/lib/marketplace/discounts";
import type { MarketplaceTrack, ProducerDiscount } from "@/lib/marketplace/types";

const day = 86400000;

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
      void apiRequest<{ tracks: MarketplaceTrack[]; total: number; serverTime?: string }>(`/api/tracks?mine=1&pageSize=10&page=${page}&q=${encodeURIComponent(query)}`, { signal: controller.signal, quiet: true })
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
  const [percentageInput, setPercentageInput] = useState(String(discount?.percentage ?? 20));
  const [startsAt, setStartsAt] = useState(() => discount?.startsAt ?? new Date(Math.floor(discountNow() / 60_000) * 60_000).toISOString());
  const [endsAt, setEndsAt] = useState(() => discount?.endsAt ?? new Date(Math.floor(discountNow() / 60_000) * 60_000 + day).toISOString());
  const [isActive, setIsActive] = useState(discount?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const close = useCallback(() => { if (!saving) onClose(); }, [saving, onClose]);
  const toast = useToast();
  const timezone = "Asia/Tehran · Jalali calendar, Tehran time";
  const percentage = Number(percentageInput);
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
      <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end"><Field label="Discount percentage *" hint="Choose 1–90%. Prices are rounded to whole toman.">{(id) => <input id={id} type="number" inputMode="numeric" min={1} max={90} step={1} required value={percentageInput} onChange={(event) => setPercentageInput(event.target.value)} className={controlClass} />}</Field><div className="flex gap-2">{[10,20,30].map((value) => <NeumorphicButton key={value} size="sm" variant={percentage === value ? "accent" : "default"} onClick={() => setPercentageInput(String(value))}>{value}%</NeumorphicButton>)}</div></div>
      <div className="grid gap-5 sm:grid-cols-2"><Field label="Starts at *">{(id) => <DynamicDateTimePicker id={id} required value={startsAt} onValueChange={setStartsAt} />}</Field><Field label="Ends at *">{(id) => <DynamicDateTimePicker id={id} required min={startsAt} value={endsAt} onValueChange={setEndsAt} />}</Field></div>
      <div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-xs text-muted">Duration</span>{[{ days: 1, label: "1 day" },{ days: 3, label: "3 days" },{ days: 7, label: "1 week" }].map((preset) => <NeumorphicButton key={preset.days} size="sm" onClick={() => { const start = Date.parse(startsAt); if (Number.isFinite(start)) setEndsAt(new Date(start + preset.days * day).toISOString()); }}>{preset.label}</NeumorphicButton>)}</div>
      <p className="text-xs leading-6 text-muted">Times use <strong className="font-semibold text-secondary">{timezone}</strong>. Offers can run for up to 90 days. A future start time schedules the offer automatically.</p>
      {discount && <label className="neo-inset flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] p-4 text-sm"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="size-4 accent-accent" /><span>Offer enabled</span></label>}
      <div className="discount-editor-summary"><div><p className="text-xs font-semibold">Your offer</p><strong>{percentage || 0}% off</strong></div>{base && previewPrice ? <div className="text-right"><p className="text-xs text-muted">Lowest current license</p><del className="mt-1 block text-xs text-muted">{formatPrice(base)}</del><p className="mt-1 font-bold">{formatPrice(previewPrice)}</p></div> : <p className="max-w-xs text-xs leading-6">The discount applies to each license’s own price. Existing purchases keep their original terms.</p>}</div>
    </fieldset>{error && <RequestError message={error} />}<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><NeumorphicButton disabled={saving} onClick={close}>Cancel</NeumorphicButton><NeumorphicButton type="submit" variant="accent" disabled={saving || (!discount && !track)}>{saving ? "Saving…" : "Save offer"}</NeumorphicButton></div></form>
  </DynamicModal>;
}


function Status({ discount }: { discount: ProducerDiscount }) { useDiscountWindowSignature([discount]); return <span className="workspace-status">{discountStatus(discount, discountNow())}</span>; }
export function DiscountsWorkspace() { const config: ResourceConfig<ProducerDiscount> = { title: "Timed offers", description: "Choose a beat and schedule a discount. Existing purchases keep their original price and terms.", endpoint: "/api/discounts", itemsKey: "discounts", pagination: "offset", searchable: false, label: item => item.trackTitle, canCreate: true, canEdit: true, canDelete: true, createLabel: "Create offer", deleteLabel: "Disable", deleteDescription: "This removes the discount from new purchases. Already quoted or paid orders keep their agreed amounts.", columns: [{ id: "beat", header: "Beat", accessor: "trackTitle" }, { id: "discount", header: "Discount", cell: item => `${item.percentage}%` }, { id: "status", header: "Status", cell: item => <Status discount={item} /> }, { id: "ends", header: "Ends", cell: item => formatPersianDateTime(item.endsAt) }], editor: ({ item, onClose, onSaved }) => <DiscountEditor discount={item} onClose={onClose} onSaved={onSaved} />, details: item => <div className="space-y-4"><p className="text-lg font-bold">{item.percentage}% off</p><Status discount={item} /><p className="text-sm text-muted">Starts {formatPersianDateTime(item.startsAt)}</p><p className="text-sm text-muted">Ends {formatPersianDateTime(item.endsAt)}</p><DiscountCountdown discount={item} /></div> }; return <ResourceManager config={config} />; }
