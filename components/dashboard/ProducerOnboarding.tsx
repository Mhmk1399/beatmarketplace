"use client";

import { useCallback, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import { DynamicModal } from "@/components/ui/dynamic/DynamicModal";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { NeumorphicSurface } from "@/components/ui/neumorphic/Surface";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { apiRequest, controlClass, errorMessage, Field, RequestError } from "@/components/studio/shared";

export function ProducerOnboarding() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [stageName, setStageName] = useState("");
  const [storefrontName, setStorefrontName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const close = useCallback(() => { if (!saving) setOpen(false); }, [saving]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSaving(true);
    try {
      await apiRequest("/api/producers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stageName, storefrontName: storefrontName || `${stageName} Store`, bio, genreIds: [] }) });
      await refresh(); toast.success("Your studio is ready", "Upload your first track and choose its preview."); setOpen(false); router.push("/studio/tracks"); router.refresh();
    } catch (error) { setError(errorMessage(error)); }
    finally { setSaving(false); }
  }

  if (user?.roles.includes("PRODUCER")) return null;
  return <>
    <NeumorphicSurface className="rounded-[var(--radius-card)] p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-widest text-[var(--accent-text)]">For producers</p><h3 className="mt-3 text-xl font-extrabold">Ready to sell your sound?</h3><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Open your producer studio, upload tracks, and choose exactly which 30 seconds buyers can hear.</p><NeumorphicButton className="mt-5" variant="accent" onClick={() => setOpen(true)} disabled={!user}>Open producer studio</NeumorphicButton></NeumorphicSurface>
    <DynamicModal open={open} onClose={close} closeOnBackdrop={!saving} title="Set up your producer studio" description="Use the name artists know you by. You can start uploading as soon as your studio is created.">
      <form onSubmit={submit} className="space-y-5" aria-busy={saving}><fieldset disabled={saving} className="space-y-5"><legend className="sr-only">Producer profile</legend>
        <Field label="Producer name *">{(id) => <input id={id} required maxLength={120} autoComplete="nickname" value={stageName} onChange={(event) => setStageName(event.target.value)} className={controlClass} />}</Field>
        <Field label="Store name" hint="Leave empty to use your producer name.">{(id) => <input id={id} maxLength={120} value={storefrontName} onChange={(event) => setStorefrontName(event.target.value)} className={controlClass} />}</Field>
        <Field label="About your sound">{(id) => <textarea id={id} rows={3} maxLength={1000} value={bio} onChange={(event) => setBio(event.target.value)} className={`${controlClass} resize-y`} />}</Field>
      </fieldset>{error && <RequestError message={error} />}<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><NeumorphicButton onClick={close} disabled={saving}>Cancel</NeumorphicButton><NeumorphicButton type="submit" variant="accent" disabled={saving}>{saving ? "Creating studio…" : "Create studio"}</NeumorphicButton></div></form>
    </DynamicModal>
  </>;
}
