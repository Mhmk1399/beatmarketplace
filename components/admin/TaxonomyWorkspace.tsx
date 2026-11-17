"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { DashboardPageIntro } from "@/components/dashboard/DashboardPageIntro";
import { DynamicModal } from "@/components/ui/dynamic/DynamicModal";
import { PlusIcon } from "@/components/ui/icons";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { NeumorphicSurface } from "@/components/ui/neumorphic/Surface";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { apiRequest, controlClass, errorMessage, Field, RequestError } from "@/components/studio/shared";
import type { TaxonomyItem, TaxonomyKind } from "@/lib/marketplace/types";

const labels: Record<TaxonomyKind, { title: string; singular: string; description: string }> = {
  genres: { title: "Genres", singular: "genre", description: "Give producers a clear genre list and help buyers find the sound they need." },
  moods: { title: "Moods", singular: "mood", description: "Keep mood names consistent across your music catalog." },
  instruments: { title: "Instruments", singular: "instrument", description: "Manage the instrument vocabulary available for catalog organization." },
};

function TaxonomyEditor({ kind, item, onClose, onSaved }: { kind: TaxonomyKind; item: TaxonomyItem | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(item?.name ?? "");
  const [slug, setSlug] = useState(item?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(item));
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const close = useCallback(() => { if (!saving) onClose(); }, [onClose, saving]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await apiRequest(item ? `/api/taxonomy/${item.id}` : "/api/taxonomy", { method: item ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, name, slug, ...(item ? { isActive } : {}) }) });
      toast.success(item ? "Changes saved" : `${labels[kind].title.slice(0, -1)} added`); onSaved();
    } catch (error) { setError(errorMessage(error)); }
    finally { setSaving(false); }
  }

  return <DynamicModal open title={`${item ? "Edit" : "Add"} ${labels[kind].singular}`} onClose={close} closeOnBackdrop={!saving}>
    <form onSubmit={submit} className="space-y-5" aria-busy={saving}>
      <fieldset disabled={saving} className="space-y-5"><legend className="sr-only">Taxonomy details</legend>
        <Field label="Name *">{(id) => <input id={id} required maxLength={80} value={name} onChange={(event) => { const next = event.target.value; setName(next); if (!slugEdited) setSlug(next.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }} className={controlClass} />}</Field>
        <Field label="Slug *" hint="Use lowercase English letters, numbers and hyphens.">{(id) => <input id={id} required maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={(event) => { setSlugEdited(true); setSlug(event.target.value); }} className={controlClass} />}</Field>
        {item && <label className="neo-inset flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] p-4 text-sm"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="size-4 accent-[var(--accent)]" /><span>Active and available in public lists</span></label>}
      </fieldset>
      {error && <RequestError message={error} />}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><NeumorphicButton disabled={saving} onClick={close}>Cancel</NeumorphicButton><NeumorphicButton type="submit" variant="accent" disabled={saving}>{saving ? "Saving…" : "Save"}</NeumorphicButton></div>
    </form>
  </DynamicModal>;
}

export function TaxonomyWorkspace({ kind }: { kind: TaxonomyKind }) {
  const [items, setItems] = useState<TaxonomyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<{ item: TaxonomyItem | null } | null>(null);
  const label = labels[kind];
  const load = useCallback(async (signal?: AbortSignal) => {
    try { const data = await apiRequest<{ items: TaxonomyItem[] }>(`/api/taxonomy?kind=${kind}&mine=1`, { signal }); setItems(data.items); setError(""); }
    catch (error) { if (!signal?.aborted) setError(errorMessage(error)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [kind]);
  useEffect(() => { const controller = new AbortController(); void Promise.resolve().then(() => { if (!controller.signal.aborted) return load(controller.signal); }); return () => controller.abort(); }, [load]);
  const closeEditor = useCallback(() => setEditor(null), []);
  const saved = useCallback(() => { setEditor(null); void load(); }, [load]);

  return <div className="space-y-7"><DashboardPageIntro eyebrow="Catalog administration" title={label.title} description={label.description} action={<NeumorphicButton variant="accent" onClick={() => setEditor({ item: null })}><PlusIcon className="size-4" /> Add {label.singular}</NeumorphicButton>} />
    {error ? <RequestError message={error} retry={() => void load()} /> : loading ? <p role="status" className="text-sm text-[var(--muted)]">Loading {kind}…</p> : items.length === 0 ? <NeumorphicSurface className="rounded-[var(--radius-card)] p-8"><h3 className="text-xl font-extrabold">No {kind} yet</h3><p className="mt-3 text-sm text-[var(--muted)]">Add the first {label.singular} to make it available in your catalog.</p><NeumorphicButton className="mt-5" onClick={() => setEditor({ item: null })}>Add {label.singular}</NeumorphicButton></NeumorphicSurface> : <NeumorphicSurface className="overflow-hidden rounded-[var(--radius-card)]"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Manage {label.title.toLowerCase()}</caption><thead><tr className="border-b border-[var(--border)] text-xs text-[var(--muted)]"><th scope="col" className="px-5 py-4 font-semibold">Name</th><th scope="col" className="px-5 py-4 font-semibold">Slug</th><th scope="col" className="px-5 py-4 font-semibold">Status</th><th scope="col" className="px-5 py-4"><span className="sr-only">Actions</span></th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b border-[var(--border)] last:border-0"><th scope="row" className="px-5 py-4 font-semibold">{item.name}</th><td className="px-5 py-4 text-[var(--muted)]">{item.slug}</td><td className={`px-5 py-4 text-xs ${item.isActive ? "text-[var(--success-text)]" : "text-[var(--muted)]"}`}>{item.isActive ? "Active" : "Inactive"}</td><td className="px-5 py-4 text-right"><NeumorphicButton size="sm" onClick={() => setEditor({ item })} aria-label={`Edit ${item.name}`}>Edit</NeumorphicButton></td></tr>)}</tbody></table></div></NeumorphicSurface>}
    {editor && <TaxonomyEditor key={editor.item?.id ?? `new-${kind}`} kind={kind} item={editor.item} onClose={closeEditor} onSaved={saved} />}
  </div>;
}
