"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { DynamicTable, type DynamicTableColumn } from "@/components/ui/dynamic/DynamicTable";
import { DynamicForm, type DynamicFormField } from "@/components/ui/dynamic/DynamicForm";
import { DynamicModal } from "@/components/ui/dynamic/DynamicModal";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { DashboardPageIntro } from "@/components/dashboard/DashboardPageIntro";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { ApiRequestError, apiRequest, errorMessage, RequestError } from "@/components/studio/shared";
import { useWorkspaceData } from "@/components/ui/dynamic/useWorkspaceData";
import type { ResourcePage } from "@/lib/workspace/types";
type Values = Record<string, string | boolean>;
export type ResourceConfig<T> = { title: string; description: string; endpoint: string; columns: DynamicTableColumn<T>[]; label: (item: T) => string; details?: (item: T) => ReactNode; fields?: (item: T | null) => DynamicFormField<Values>[]; values?: (item: T | null) => Values; payload?: (values: Values, item: T | null) => unknown; createLabel?: string; deleteLabel?: string; deleteDescription?: string; canCreate?: boolean; canEdit?: boolean; canDelete?: boolean; query?: string; searchable?: boolean; itemsKey?: string; pagination?: "cursor" | "offset"; toolbar?: ReactNode; deletePayload?: (item: T) => unknown; editor?: (props: { item: T | null; onClose: () => void; onSaved: () => void }) => ReactNode };
export function ResourceManager<T extends { id: string; version?: number }>({ config }: { config: ResourceConfig<T> }) {
  const [search, setSearch] = useState(""), [q, setQ] = useState(""), [cursors, setCursors] = useState([""]);
  const [editor, setEditor] = useState<{ item: T | null } | null>(null), [view, setView] = useState<T | null>(null), [remove, setRemove] = useState<T | null>(null);
  const [values, setValues] = useState<Values>({}), [saving, setSaving] = useState(false), [formError, setFormError] = useState(""), [errors, setErrors] = useState<Record<string,string>>({});
  const auth = useAuth(), router = useRouter();
  const toast = useToast(), cursor = cursors[cursors.length - 1];
  useEffect(() => { const value = search.trim(); if (value === q) return; const timer = setTimeout(() => { setQ(value); setCursors([""]); }, 250); return () => clearTimeout(timer); }, [search, q]);
  const query = new URLSearchParams(config.query);
  if (config.pagination === "offset") { query.set("page", cursor || "1"); query.set("pageSize", "20"); }
  else { query.set("limit", "20"); if (cursor) query.set("cursor", cursor); }
  if (q) query.set("q", q);
  const cached = useWorkspaceData<ResourcePage<T> & Record<string, unknown>>(`${config.endpoint}?${query}`, { quiet: Boolean(q) });
  const { isLoading: loading, isValidating, refresh } = cached;
  const error = cached.error ? errorMessage(cached.error) : "";
  const result = cached.data;
  const data: ResourcePage<T> | null = result ? { ...result,
    items: (config.itemsKey ? result[config.itemsKey] : result.items) as T[],
    hasMore: Boolean(result.hasMore ?? (typeof result.total === "number" && Number(cursor || 1) * 20 < result.total)),
    nextCursor: result.nextCursor ?? (config.pagination === "offset" ? String(Number(cursor || 1) + 1) : null),
  } : null;
  function edit(item: T | null) { setValues(config.values?.(item) ?? {}); setEditor({ item }); setErrors({}); setFormError(""); }
  async function save() { if (!editor || saving) return; setSaving(true); setErrors({}); setFormError(""); try { await apiRequest(editor.item ? `${config.endpoint}/${editor.item.id}` : config.endpoint, { method: editor.item ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config.payload?.(values, editor.item) ?? values) }); toast.success(editor.item ? "Changes saved" : "Record created"); if (config.endpoint === "/api/admin/users" && editor.item?.id === auth.user?.id) { await auth.refresh(); router.refresh(); } setEditor(null);  } catch (error) { setFormError(errorMessage(error)); if (error instanceof ApiRequestError) setErrors(Object.fromEntries(error.issues.map(issue => [issue.field, issue.message]))); } finally { setSaving(false); } }
  async function destroy() { if (!remove || saving) return; setSaving(true); setFormError(""); try { await apiRequest(`${config.endpoint}/${remove.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config.deletePayload?.(remove) ?? { expectedVersion: remove.version }) }); toast.success("Changes saved"); setRemove(null);  } catch (error) { setFormError(errorMessage(error)); } finally { setSaving(false); } }
  return <div className="space-y-6"><DashboardPageIntro eyebrow="Workspace management" title={config.title} description={config.description} action={config.canCreate && <NeumorphicButton variant="accent" onClick={() => edit(null)}>{config.createLabel ?? "Create new"}</NeumorphicButton>} />
    {config.toolbar}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">{config.searchable !== false && <label className="block w-full sm:max-w-sm"><span className="sr-only">Search {config.title}</span><input type="search" value={search} maxLength={160} onChange={event => setSearch(event.target.value)} className="neo-input-wrap min-h-12 w-full rounded-[var(--radius-control)] px-4 text-sm" placeholder={`Search ${config.title.toLowerCase()}…`} /></label>}<NeumorphicButton disabled={loading || isValidating} onClick={() => { void refresh(); }}>Refresh</NeumorphicButton></div>
    {error ? <RequestError message={error} retry={() => { void refresh(); }} /> : <DynamicTable caption={config.title} columns={config.columns} rows={data?.items ?? []} getRowKey={item => item.id} getRowLabel={config.label} isLoading={loading} busy={saving} onView={setView} onEdit={config.canEdit ? edit : undefined} onDelete={config.canDelete ? item => { setRemove(item); setFormError(""); } : undefined} deleteLabel={config.deleteLabel} />}
    {data && !error && <nav aria-label={`${config.title} pages`} className="flex items-center justify-between gap-3"><NeumorphicButton disabled={loading || cursors.length === 1} onClick={() => setCursors(items => items.slice(0, -1))}>Previous</NeumorphicButton><span className="text-xs text-muted">Page {cursors.length}</span><NeumorphicButton disabled={loading || !data.hasMore} onClick={() => { if (data.nextCursor) setCursors(items => [...items, data.nextCursor!]); }}>Next</NeumorphicButton></nav>}
    {view && <DynamicModal open title={config.label(view)} onClose={() => setView(null)}>{config.details?.(view) ?? <dl className="space-y-4">{config.columns.map(column => <div key={column.id}><dt className="text-xs text-muted">{column.header}</dt><dd className="mt-2 break-words text-sm">{column.cell?.(view, 0) ?? String(column.accessor ? view[column.accessor] ?? "" : "")}</dd></div>)}</dl>}</DynamicModal>}
    {editor && config.editor ? config.editor({ item: editor.item, onClose: () => setEditor(null), onSaved: () => { setEditor(null);  } }) : editor && <DynamicModal open title={editor.item ? `Edit ${config.label(editor.item)}` : config.createLabel ?? "Create record"} onClose={() => { if (!saving) setEditor(null); }} closeOnBackdrop={!saving}><DynamicForm fields={config.fields?.(editor.item) ?? []} values={values} onValueChange={(name, value) => setValues(current => ({ ...current, [name]: value }))} onSubmit={event => { event.preventDefault(); void save(); }} errors={errors} formError={formError} submitLabel="Save changes" isSubmitting={saving} columns={2} actions={<NeumorphicButton disabled={saving} onClick={() => setEditor(null)}>Cancel</NeumorphicButton>} /></DynamicModal>}
    {remove && <DynamicModal open title={`${config.deleteLabel ?? "Delete"} ${config.label(remove)}?`} onClose={() => { if (!saving) setRemove(null); }} closeOnBackdrop={!saving}><p className="text-sm leading-7 text-muted">{config.deleteDescription ?? "This record will be removed. Review the selected item before continuing."}</p>{formError && <RequestError message={formError} />}<div className="mt-6 flex justify-end gap-3"><NeumorphicButton disabled={saving} onClick={() => setRemove(null)}>Cancel</NeumorphicButton><NeumorphicButton variant="accent" disabled={saving} onClick={() => void destroy()}>{saving ? "Saving…" : config.deleteLabel ?? "Delete"}</NeumorphicButton></div></DynamicModal>}
  </div>;
}
