"use client";
import { useCallback, useState, type FormEvent } from "react";
import { DynamicModal } from "@/components/ui/dynamic/DynamicModal";
import { DynamicSelect } from "@/components/ui/dynamic/DynamicSelect";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { ResourceManager, type ResourceConfig } from "@/components/admin/ResourceManager";
import { OwnedBeatPicker } from "./OwnedBeatPicker";
import { apiRequest, controlClass, errorMessage, Field, RequestError } from "./shared";
import type { StudioLicense } from "@/lib/marketplace/types";
function ContractEditor({ contract, onClose, onSaved }: { contract: StudioLicense | null; onClose: () => void; onSaved: () => void }) {
  const [values, setValues] = useState({ title: contract?.title ?? "WAV License", price: contract?.price ?? "250000", licenseType: contract?.licenseType ?? "NON_EXCLUSIVE", streamingLimit: contract?.streamingLimit === null || !contract ? "" : String(contract.streamingLimit), distributionLimit: contract?.distributionLimit === null || !contract ? "" : String(contract.distributionLimit), customTerms: contract?.customTerms ?? "" });
  const [trackIds, setTrackIds] = useState(contract?.trackIds ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const close = useCallback(() => { if (!saving) onClose(); }, [saving, onClose]);

  function update(name: keyof typeof values, value: string) { setValues((current) => ({ ...current, [name]: value })); }

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
        <Field label="License type">{(id) => <DynamicSelect id={id} value={values.licenseType} onChange={(event) => update("licenseType", event.target.value)} className={controlClass}><option value="NON_EXCLUSIVE">Non-exclusive</option><option value="EXCLUSIVE">Exclusive</option></DynamicSelect>}</Field>
        {values.licenseType === "EXCLUSIVE" && <p className="text-xs leading-5 text-[var(--warning-text)]">You can prepare exclusive license terms here. Exclusive purchases require a direct agreement with the producer; online checkout for exclusive licenses is coming later.</p>}
        <OwnedBeatPicker selected={trackIds} onChange={setTrackIds} />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Streaming limit" hint="Leave empty for unlimited streams.">{(id) => <input id={id} type="number" min={0} max={1000000000} step={1} value={values.streamingLimit} onChange={(event) => update("streamingLimit", event.target.value)} placeholder="Unlimited" className={controlClass} />}</Field>
          <Field label="Distribution limit" hint="Leave empty for unlimited copies.">{(id) => <input id={id} type="number" min={0} max={1000000000} step={1} value={values.distributionLimit} onChange={(event) => update("distributionLimit", event.target.value)} placeholder="Unlimited" className={controlClass} />}</Field>
        </div>
        <Field label="Additional terms" hint="Describe credit requirements and any other usage conditions clearly.">{(id) => <textarea id={id} rows={5} maxLength={20000} value={values.customTerms} onChange={(event) => update("customTerms", event.target.value)} className={`${controlClass} resize-y`} />}</Field>
        <p className="text-xs leading-5 text-[var(--muted)]">Includes the full WAV file. New purchases use the current version of your license; previous purchases keep their original terms.</p>
      </fieldset>
      {error && <RequestError message={error} />}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><NeumorphicButton disabled={saving} onClick={close}>Cancel</NeumorphicButton><NeumorphicButton type="submit" variant="accent" disabled={saving}>{saving ? "Saving…" : "Save license"}</NeumorphicButton></div>
    </form>
  </DynamicModal>;
}


export function ContractsWorkspace() { const config: ResourceConfig<StudioLicense> = { title: "Licenses", description: "Set clear usage terms and prices for your catalog. Existing purchases keep the terms they were sold with.", endpoint: "/api/contracts", query: "mine=1", label: item => item.title, canCreate: true, canEdit: true, canDelete: true, createLabel: "Create license", deleteLabel: "Disable", deleteDescription: "New buyers will no longer be offered this license. Previously purchased licenses remain valid.", columns: [{ id: "title", header: "License", accessor: "title" }, { id: "price", header: "Price", cell: item => `${Number(item.price).toLocaleString()} Toman` }, { id: "type", header: "Type", accessor: "licenseType" }, { id: "tracks", header: "Beats", cell: item => item.trackIds.length }, { id: "status", header: "Status", cell: item => item.isActive ? "Active" : "Inactive" }], editor: ({ item, onClose, onSaved }) => <ContractEditor contract={item} onClose={onClose} onSaved={onSaved} />, details: item => <div className="space-y-4"><p className="text-sm">{Number(item.price).toLocaleString()} Toman</p><p className="text-sm text-muted">{item.licenseType} | Version {item.version} | {item.trackIds.length} beats</p><p className="whitespace-pre-wrap text-sm leading-7 text-muted">{item.customTerms || "No additional terms."}</p></div> }; return <ResourceManager config={config} />; }
