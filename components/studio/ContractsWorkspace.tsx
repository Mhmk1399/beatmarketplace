"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { DashboardPageIntro } from "@/components/dashboard/DashboardPageIntro";
import { DynamicModal } from "@/components/ui/dynamic/DynamicModal";
import { PlusIcon, TagIcon } from "@/components/ui/icons";
import { NeumorphicButton, NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { NeumorphicSurface } from "@/components/ui/neumorphic/Surface";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { apiRequest, controlClass, errorMessage, Field, RequestError } from "@/components/studio/shared";
import type { MarketplaceTrack, StudioLicense } from "@/lib/marketplace/types";

function ContractEditor({ contract, tracks, onClose, onSaved }: { contract: StudioLicense | null; tracks: MarketplaceTrack[]; onClose: () => void; onSaved: () => void }) {
  const [values, setValues] = useState({ title: contract?.title ?? "WAV License", price: contract?.price ?? "250000", licenseType: contract?.licenseType ?? "NON_EXCLUSIVE", streamingLimit: contract?.streamingLimit === null || !contract ? "" : String(contract.streamingLimit), distributionLimit: contract?.distributionLimit === null || !contract ? "" : String(contract.distributionLimit), customTerms: contract?.customTerms ?? "" });
  const [trackIds, setTrackIds] = useState(contract?.trackIds ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const close = useCallback(() => { if (!saving) onClose(); }, [saving, onClose]);

  function update(name: keyof typeof values, value: string) { setValues((current) => ({ ...current, [name]: value })); }
  function toggleTrack(id: string) { setTrackIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (trackIds.length === 0) { setError("Select at least one track for this license."); return; }
    setSaving(true);
    try {
      await apiRequest(contract ? `/api/contracts/${contract.id}` : "/api/contracts", {
        method: contract ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, currency: "IRT", trackIds, formats: ["WAV"], streamingLimit: values.streamingLimit === "" ? null : Number(values.streamingLimit), distributionLimit: values.distributionLimit === "" ? null : Number(values.distributionLimit) }),
      });
      toast.success("License saved", "Buyers will see the updated terms and price."); onSaved();
    } catch (error) { setError(errorMessage(error)); }
    finally { setSaving(false); }
  }

  return <DynamicModal open onClose={close} closeOnBackdrop={!saving} title={contract ? "Edit license" : "Create a license"} description="Set the price and usage limits buyers see before purchase. Your WAV master is delivered only after a verified payment." size="lg">
    <form onSubmit={submit} className="space-y-6" aria-busy={saving}>
      <fieldset disabled={saving} className="space-y-5">
        <legend className="sr-only">License details</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="License name *">{(id) => <input id={id} required maxLength={160} value={values.title} onChange={(event) => update("title", event.target.value)} className={controlClass} />}</Field>
          <Field label="Price (Toman) *" hint="Whole Toman, from 1,000 to 1,000,000,000.">{(id) => <input id={id} type="number" inputMode="numeric" min={1000} max={1000000000} step={1} required value={values.price} onChange={(event) => update("price", event.target.value)} className={controlClass} />}</Field>
        </div>
        <Field label="License type">{(id) => <select id={id} value={values.licenseType} onChange={(event) => update("licenseType", event.target.value)} className={controlClass}><option value="NON_EXCLUSIVE">Non-exclusive</option><option value="EXCLUSIVE">Exclusive</option></select>}</Field>
        {values.licenseType === "EXCLUSIVE" && <p className="text-xs leading-5 text-[var(--warning-text)]">You can prepare exclusive license terms here. Exclusive purchases require a direct agreement with the producer; online checkout for exclusive licenses is coming later.</p>}
        <fieldset className="neo-inset space-y-3 rounded-[var(--radius-control)] p-4"><legend className="px-2 text-sm font-semibold text-[var(--text-secondary)]">Included tracks *</legend>
          {tracks.length ? tracks.map((track) => <label key={track.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 text-sm text-[var(--text-secondary)]"><input type="checkbox" checked={trackIds.includes(track.id)} disabled={track.status === "ARCHIVED" && !trackIds.includes(track.id)} onChange={() => toggleTrack(track.id)} className="size-4 accent-[var(--accent)]" /><span className="min-w-0 flex-1 truncate">{track.title}</span><span className="text-xs text-[var(--muted)]">{track.status.toLowerCase()}</span></label>) : <p className="py-2 text-sm text-[var(--muted)]">Upload a track before creating a license.</p>}
        </fieldset>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Streaming limit" hint="Leave empty for unlimited streams.">{(id) => <input id={id} type="number" min={0} max={1000000000} step={1} value={values.streamingLimit} onChange={(event) => update("streamingLimit", event.target.value)} placeholder="Unlimited" className={controlClass} />}</Field>
          <Field label="Distribution limit" hint="Leave empty for unlimited copies.">{(id) => <input id={id} type="number" min={0} max={1000000000} step={1} value={values.distributionLimit} onChange={(event) => update("distributionLimit", event.target.value)} placeholder="Unlimited" className={controlClass} />}</Field>
        </div>
        <Field label="Additional terms" hint="Describe credit requirements and any other usage conditions clearly.">{(id) => <textarea id={id} rows={5} maxLength={20000} value={values.customTerms} onChange={(event) => update("customTerms", event.target.value)} className={`${controlClass} resize-y`} />}</Field>
        <p className="text-xs leading-5 text-[var(--muted)]">Includes the full WAV file. New purchases use the current version of your license; previous purchases keep their original terms.</p>
      </fieldset>
      {error && <RequestError message={error} />}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><NeumorphicButton disabled={saving} onClick={close}>Cancel</NeumorphicButton><NeumorphicButton type="submit" variant="accent" disabled={saving || tracks.length === 0}>{saving ? "Saving…" : "Save license"}</NeumorphicButton></div>
    </form>
  </DynamicModal>;
}

export function ContractsWorkspace() {
  const [contracts, setContracts] = useState<StudioLicense[]>([]);
  const [tracks, setTracks] = useState<MarketplaceTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<{ contract: StudioLicense | null } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const toast = useToast();

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const [licenses, firstPage] = await Promise.all([
        apiRequest<{ contracts: StudioLicense[] }>("/api/contracts?mine=1", { signal }),
        apiRequest<{ tracks: MarketplaceTrack[]; total: number; pageSize: number }>("/api/tracks?mine=1&pageSize=48", { signal }),
      ]);
      // Fetch all owned catalog pages so an older track can always receive a license.
      let ownedTracks = firstPage.tracks;
      const pageSize = firstPage.pageSize || 48;
      for (let page = 2; (page - 1) * pageSize < firstPage.total; page += 1) {
        const next = await apiRequest<{ tracks: MarketplaceTrack[] }>(`/api/tracks?mine=1&pageSize=${pageSize}&page=${page}`, { signal });
        ownedTracks = [...ownedTracks, ...next.tracks];
      }
      setContracts(licenses.contracts); setTracks(ownedTracks); setError("");
    } catch (error) { if (!signal?.aborted) setError(errorMessage(error)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void Promise.resolve().then(() => { if (!controller.signal.aborted) return load(controller.signal); }); return () => controller.abort(); }, [load]);
  const closeEditor = useCallback(() => setEditor(null), []);
  const saved = useCallback(() => { setEditor(null); void load(); }, [load]);

  async function deactivate(contract: StudioLicense) {
    setBusyId(contract.id);
    try { await apiRequest(`/api/contracts/${contract.id}`, { method: "DELETE" }); toast.success("License deactivated", "Existing purchases keep their terms."); await load(); }
    catch (error) { toast.error("Could not deactivate license", errorMessage(error)); }
    finally { setBusyId(null); }
  }

  return <div className="space-y-7">
    <DashboardPageIntro eyebrow="Licensing" title="Your licenses" description="Make prices and usage rights easy to compare. Each license can apply to one or several tracks." action={<NeumorphicButton variant="accent" onClick={() => setEditor({ contract: null })} disabled={loading || tracks.length === 0}><PlusIcon className="size-4" /> Create license</NeumorphicButton>} />
    {error ? <RequestError message={error} retry={() => void load()} /> : loading ? <p role="status" className="text-sm text-[var(--muted)]">Loading licenses…</p> : contracts.length === 0 ? <NeumorphicSurface className="rounded-[var(--radius-card)] p-8 sm:p-12"><TagIcon className="size-10 text-[var(--accent-text)]" /><h3 className="mt-5 text-xl font-extrabold">Give your music clear terms</h3><p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">Create a WAV license, set a price in Toman, and choose the tracks it covers. Buyers can review it before adding a track to their cart.</p>{tracks.length ? <NeumorphicButton className="mt-6" variant="accent" onClick={() => setEditor({ contract: null })}>Create your first license</NeumorphicButton> : <NeumorphicLink className="mt-6" variant="accent" href="/studio/tracks">Upload a track first</NeumorphicLink>}</NeumorphicSurface> : <div className="grid gap-5 xl:grid-cols-2">{contracts.map((contract) => <NeumorphicSurface key={contract.id} className="flex flex-col rounded-[var(--radius-card)] p-6"><div className="flex items-start justify-between gap-4"><div><h3 className="font-extrabold text-[var(--text)]">{contract.title}</h3><p className="mt-2 text-xs text-[var(--muted)]">{contract.licenseType === "EXCLUSIVE" ? "Exclusive" : "Non-exclusive"} · version {contract.version} · {contract.isActive ? "Active" : "Inactive"}</p></div><span className="text-right text-lg font-black text-[var(--accent-text)]">{Number(contract.price).toLocaleString()}<span className="mt-1 block text-xs font-normal">Toman</span></span></div>
      <dl className="neo-inset mt-5 grid grid-cols-2 gap-4 rounded-[var(--radius-control)] p-4 text-xs"><div><dt className="text-[var(--muted)]">Streams</dt><dd className="mt-1 font-bold">{contract.streamingLimit === null ? "Unlimited" : contract.streamingLimit.toLocaleString()}</dd></div><div><dt className="text-[var(--muted)]">Copies</dt><dd className="mt-1 font-bold">{contract.distributionLimit === null ? "Unlimited" : contract.distributionLimit.toLocaleString()}</dd></div><div><dt className="text-[var(--muted)]">Delivery</dt><dd className="mt-1 font-bold">{contract.formats.join(", ")}</dd></div><div><dt className="text-[var(--muted)]">Tracks</dt><dd className="mt-1 font-bold">{contract.trackIds.length}</dd></div></dl>
      <p className="mt-4 line-clamp-3 whitespace-pre-line text-xs leading-6 text-[var(--muted)]">{contract.customTerms || "No additional terms."}</p>
      <div className="mt-auto flex flex-wrap gap-2 pt-5">{contract.isActive ? <><NeumorphicButton size="sm" onClick={() => setEditor({ contract })}>Edit license</NeumorphicButton><NeumorphicButton size="sm" variant="quiet" disabled={busyId === contract.id} onClick={() => void deactivate(contract)}>{busyId === contract.id ? "Deactivating…" : "Deactivate"}</NeumorphicButton></> : <p className="text-xs leading-5 text-[var(--muted)]">This license is inactive. Create a new license to offer these tracks again.</p>}</div>
    </NeumorphicSurface>)}</div>}
    {editor && <ContractEditor key={editor.contract?.id ?? "new"} contract={editor.contract} tracks={tracks} onClose={closeEditor} onSaved={saved} />}
  </div>;
}
