"use client";
import { useEffect, useState } from "react";
import { DynamicSelect } from "@/components/ui/dynamic/DynamicSelect";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { apiRequest, controlClass, errorMessage } from "@/components/studio/shared";
import type { MarketplaceTrack } from "@/lib/marketplace/types";

export function FeaturedBeatPicker({ producerId, value, onChange, disabled }: { producerId: string; value: string[]; onChange: (value: string[]) => void; disabled: boolean }) {
  const [search, setSearch] = useState(""), [cursor, setCursor] = useState(""), [next, setNext] = useState<string | null>(null);
  const [beats, setBeats] = useState<MarketplaceTrack[]>([]), [names, setNames] = useState<Record<string, string>>({}), [error, setError] = useState(""), [loading, setLoading] = useState(false);
  const ids = value.join(",");
  useEffect(() => {
    if (!ids) return;
    const controller = new AbortController();
    void apiRequest<{ items: { id: string; title: string }[] }>(`/api/studio/tracks/lookup?ids=${ids}`, { signal: controller.signal, quiet: true }).then(data => setNames(current => ({ ...current, ...Object.fromEntries(data.items.map(beat => [beat.id, beat.title])) }))).catch(() => undefined);
    return () => controller.abort();
  }, [ids]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiRequest<{ tracks: MarketplaceTrack[]; nextCursor: string | null }>(`/api/producers/${producerId}/beats?limit=24&q=${encodeURIComponent(search)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`, { quiet: true, signal: controller.signal });
        if (!controller.signal.aborted) { setBeats(data.tracks); setNext(data.nextCursor); setNames(current => ({ ...current, ...Object.fromEntries(data.tracks.map(beat => [beat.id, beat.title])) })); setError(""); }
      } catch (error) { if (!controller.signal.aborted) setError(errorMessage(error)); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [producerId, search, cursor]);
  function reorder(index: number, step: number) { const updated = [...value]; [updated[index], updated[index + step]] = [updated[index + step], updated[index]]; onChange(updated); }
  return <fieldset className="neo-inset min-w-0 space-y-4 rounded-[var(--radius-control)] p-4" disabled={disabled}>
    <legend className="px-2 text-sm font-bold">Featured beats · {value.length}/6</legend>
    <p className="text-xs leading-6 text-muted">Choose up to six of your public beats. Their order here is their order on your page.</p>
    <label className="block"><span className="sr-only">Find a featured beat</span><input className={controlClass} type="search" placeholder="Find one of your published beats…" maxLength={160} value={search} onChange={event => { setSearch(event.target.value); setCursor(""); }} /></label>
    <DynamicSelect aria-label="Add a featured beat" disabled={disabled || value.length >= 6 || loading} value="" options={[{ value: "", label: loading ? "Finding your beats…" : "Choose a public beat", disabled: true }, ...beats.map(beat => ({ value: beat.id, label: beat.title, disabled: value.includes(beat.id) }))]} onChange={event => { if (event.target.value) onChange([...value, event.target.value]); }} />
    {!loading && !beats.length && <p className="text-xs text-muted">{search ? "No public beats match this search." : "Publish a public beat to feature it here."}</p>}
    {error && <p role="alert" className="text-xs text-error-text">{error}</p>}
    <div className="space-y-2">{value.map((id, index) => <div key={id} className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--border)] p-2"><span className="text-xs text-accent-text">{index + 1}</span><span className="min-w-0 flex-1 truncate text-xs">{names[id] || "Selected beat"}</span><NeumorphicButton size="sm" variant="quiet" className="px-3" disabled={disabled || !index} aria-label={`Move ${names[id] || "beat"} up`} onClick={() => reorder(index, -1)}>↑</NeumorphicButton><NeumorphicButton size="sm" variant="quiet" className="px-3" disabled={disabled || index === value.length - 1} aria-label={`Move ${names[id] || "beat"} down`} onClick={() => reorder(index, 1)}>↓</NeumorphicButton><NeumorphicButton size="sm" variant="quiet" className="px-3" disabled={disabled} aria-label={`Remove ${names[id] || "beat"} from featured beats`} onClick={() => onChange(value.filter(item => item !== id))}>×</NeumorphicButton></div>)}</div>
    {(cursor || next) && <div className="flex gap-3">{cursor && <NeumorphicButton size="sm" onClick={() => setCursor("")}>First page</NeumorphicButton>}<NeumorphicButton size="sm" disabled={!next || loading} onClick={() => { if (next) setCursor(next); }}>More beats</NeumorphicButton></div>}
  </fieldset>;
}
