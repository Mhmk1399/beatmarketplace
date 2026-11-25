"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { SearchIcon, PlusIcon, GridIcon } from "@/components/ui/icons";
import { useRouter, useSearchParams } from "next/navigation";
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
type StatusAction<T> = {
  label: (item: T) => string;
  description: (item: T) => string;
  payload: (item: T) => unknown;
};
export type ResourceConfig<T> = {
  renderCard?: (item: T, actions: { view: () => void; edit: () => void; remove: () => void }) => ReactNode;
  title: string;
  description: string;
  endpoint: string;
  columns: DynamicTableColumn<T>[];
  label: (item: T) => string;
  details?: (item: T) => ReactNode;
  fields?: (item: T | null) => DynamicFormField<Values>[];
  values?: (item: T | null) => Values;
  payload?: (values: Values, item: T | null) => unknown;
  createLabel?: string;
  deleteLabel?: string;
  deleteDescription?: string;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  statusAction?: StatusAction<T>;
  query?: string;
  searchable?: boolean;
  refreshOnReturn?: boolean;
  itemsKey?: string;
  pagination?: "cursor" | "offset";
  toolbar?: ReactNode;
  summary?: (result: (ResourcePage<T> & Record<string, unknown>) | null, state: { loading: boolean; error: string }) => ReactNode;
  deletePayload?: (item: T) => unknown;
  editor?: (props: { item: T | null; onClose: () => void; onSaved: () => void }) => ReactNode;
};
export function ResourceManager<T extends { id: string; version?: number }>({ config }: { config: ResourceConfig<T> }) {
  const [layout, setLayout] = useState<"grid" | "list">(config.renderCard ? "grid" : "list");
  const [search, setSearch] = useState(""), [q, setQ] = useState("");
  const [paginationState, setPaginationState] = useState({ query: config.query ?? "", cursors: [""] });
  const [editor, setEditor] = useState<{ item: T | null } | null>(null), [view, setView] = useState<T | null>(null), [remove, setRemove] = useState<T | null>(null);
  const [statusItem, setStatusItem] = useState<T | null>(null);
  const [statusError, setStatusError] = useState("");
  const [values, setValues] = useState<Values>({}), [saving, setSaving] = useState(false), [formError, setFormError] = useState(""), [errors, setErrors] = useState<Record<string,string>>({});
  const auth = useAuth(), router = useRouter();
  const { canCreate, canEdit, endpoint, values: createValues } = config;
  const searchParams = useSearchParams();
  const createRequested = searchParams.get("create") === "1";
  const editRequested = searchParams.get("edit");
  useEffect(() => {
    if (!canCreate || !createRequested) return;
    const frame = requestAnimationFrame(() => {
      setEditor({ item: null }); setValues(createValues?.(null) ?? {}); setErrors({}); setFormError("");
      const url = new URL(window.location.href); url.searchParams.delete("create");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    });
    return () => cancelAnimationFrame(frame);
  }, [canCreate, endpoint, createValues, createRequested]);
  const activeCursors = paginationState.query === (config.query ?? "") ? paginationState.cursors : [""];
  const toast = useToast(), cursor = activeCursors[activeCursors.length - 1];
  useEffect(() => { const value = search.trim(); if (value === q) return; const timer = setTimeout(() => { setQ(value); setPaginationState({ query: config.query ?? "", cursors: [""] }); }, 250); return () => clearTimeout(timer); }, [search, q, config.query]);
  const query = new URLSearchParams(config.query);
  if (config.pagination === "offset") { query.set("page", cursor || "1"); query.set("pageSize", "20"); }
  else { query.set("limit", "20"); if (cursor) query.set("cursor", cursor); }
  if (q) query.set("q", q);
  const cached = useWorkspaceData<ResourcePage<T> & Record<string, unknown>>(`${config.endpoint}?${query}`, { quiet: Boolean(q) || config.refreshOnReturn, refreshOnReturn: config.refreshOnReturn });
  const { isLoading: loading, isValidating, refresh } = cached;
  const error = cached.error ? errorMessage(cached.error) : "";
  const result = cached.data;
  const data: ResourcePage<T> | null = useMemo(() => result ? { ...result,
    items: (config.itemsKey ? result[config.itemsKey] : result.items) as T[],
    hasMore: Boolean(result.hasMore ?? (typeof result.total === "number" && Number(cursor || 1) * 20 < result.total)),
    nextCursor: result.nextCursor ?? (config.pagination === "offset" ? String(Number(cursor || 1) + 1) : null),
  } : null, [config.itemsKey, config.pagination, cursor, result]);
  useEffect(() => {
    if (!canEdit || !editRequested || !data) return;
    const item = data.items.find(candidate => candidate.id === editRequested);
    if (!item) return;
    const frame = requestAnimationFrame(() => {
      const url = new URL(window.location.href);
      if (url.searchParams.get("edit") !== editRequested) return;
      setValues(createValues?.(item) ?? {});
      setEditor({ item });
      setErrors({});
      setFormError("");
      url.searchParams.delete("edit");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    });
    return () => cancelAnimationFrame(frame);
  }, [canEdit, createValues, data, editRequested]);
  function edit(item: T | null) { setValues(config.values?.(item) ?? {}); setEditor({ item }); setErrors({}); setFormError(""); }
  async function save() { if (!editor || saving) return; setSaving(true); setErrors({}); setFormError(""); try { await apiRequest(editor.item ? `${config.endpoint}/${editor.item.id}` : config.endpoint, { method: editor.item ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config.payload?.(values, editor.item) ?? values) }); toast.success(editor.item ? "Changes saved" : "Record created"); if (config.endpoint === "/api/admin/users" && editor.item?.id === auth.user?.id) { await auth.refresh(); router.refresh(); } setEditor(null);  } catch (error) { setFormError(errorMessage(error)); if (error instanceof ApiRequestError) setErrors(Object.fromEntries(error.issues.map(issue => [issue.field, issue.message]))); } finally { setSaving(false); } }
  async function destroy() { if (!remove || saving) return; setSaving(true); setFormError(""); try { await apiRequest(`${config.endpoint}/${remove.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config.deletePayload?.(remove) ?? { expectedVersion: remove.version }) }); toast.success("Changes saved"); setRemove(null);  } catch (error) { setFormError(errorMessage(error)); } finally { setSaving(false); } }
  async function changeStatus() {
    if (!statusItem || !config.statusAction || saving) return;
    setSaving(true);
    setStatusError("");
    try {
      await apiRequest(`${config.endpoint}/${statusItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config.statusAction.payload(statusItem)),
      });
      // apiRequest invalidates the resource's SWR pages after a successful write.
      toast.success("Changes saved");
      setStatusItem(null);
    } catch (error) {
      setStatusError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }
  return <div className="workspace-resource space-y-6"><DashboardPageIntro eyebrow="Workspace management" title={config.title} description={config.description} action={config.canCreate && <NeumorphicButton variant="accent" onClick={() => edit(null)}><PlusIcon className="size-4" />{config.createLabel ?? "Create new"}</NeumorphicButton>} />
    {config.summary?.(result ?? null, { loading, error })}
    <div className="workspace-resource-toolbar">{config.searchable !== false && <label className="workspace-resource-search"><SearchIcon className="size-5" /><span className="sr-only">Search {config.title}</span><input type="search" value={search} maxLength={160} onChange={event => setSearch(event.target.value)} placeholder={`Search ${config.title.toLowerCase()}…`} /></label>}<div className="workspace-resource-filters">{config.toolbar}{config.renderCard && <div className="workspace-view-toggle" role="group" aria-label="Catalog view"><button type="button" aria-label="Grid view" aria-pressed={layout === "grid"} onClick={()=>setLayout("grid")}><GridIcon className="size-4" /><span className="sr-only">Grid</span></button><button type="button" aria-label="List view" aria-pressed={layout === "list"} onClick={()=>setLayout("list")}><svg aria-hidden="true" className="size-4" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" /></svg><span className="sr-only">List</span></button></div>}<NeumorphicButton size="sm" disabled={loading || isValidating} onClick={() => { void refresh(); }}>Refresh</NeumorphicButton></div></div>
    {error ? <RequestError message={error} retry={() => { void refresh(); }} /> : config.renderCard && layout === "grid" ? loading ? <p role="status" className="workspace-loading-status">Loading your catalog…</p> : data?.items.length ? <div className="workspace-track-grid">{data.items.map(item=><div key={item.id}>{config.renderCard!(item,{view:()=>setView(item),edit:()=>edit(item),remove:()=>{setRemove(item);setFormError("");}})}</div>)}</div> : <div className="workspace-empty-message neo-inset rounded-xl p-8"><h2 className="font-bold text-foreground">No results</h2><p className="mt-2 text-sm">{q ? "Try a different search." : "Your catalog will appear here. Upload a beat to get started."}</p></div> : <DynamicTable caption={config.title} columns={config.columns} rows={data?.items ?? []} getRowKey={item => item.id} getRowLabel={config.label} isLoading={loading} busy={saving} onView={setView} onEdit={config.canEdit ? edit : undefined} rowAction={config.statusAction ? { label: config.statusAction.label, onClick: item => { setStatusItem(item); setStatusError(""); } } : undefined} onDelete={config.canDelete ? item => { setRemove(item); setFormError(""); } : undefined} deleteLabel={config.deleteLabel} />}
    {data && !error && <nav aria-label={`${config.title} pages`} className="workspace-resource-pagination"><NeumorphicButton disabled={loading || activeCursors.length === 1} onClick={() => setPaginationState({ query: config.query ?? "", cursors: activeCursors.slice(0, -1) })}>Previous</NeumorphicButton><span className="text-xs text-muted">Page {activeCursors.length}</span><NeumorphicButton disabled={loading || !data.hasMore} onClick={() => { if (data.nextCursor) setPaginationState({ query: config.query ?? "", cursors: [...activeCursors, data.nextCursor] }); }}>Next</NeumorphicButton></nav>}
    {view && <DynamicModal open title={config.label(view)} onClose={() => setView(null)}>{config.details?.(view) ?? <dl className="space-y-4">{config.columns.map(column => <div key={column.id}><dt className="text-xs text-muted">{column.header}</dt><dd className="mt-2 break-words text-sm">{column.cell?.(view, 0) ?? String(column.accessor ? view[column.accessor] ?? "" : "")}</dd></div>)}</dl>}</DynamicModal>}
    {editor && config.editor ? config.editor({ item: editor.item, onClose: () => setEditor(null), onSaved: () => { setEditor(null);  } }) : editor && <DynamicModal open title={editor.item ? `Edit ${config.label(editor.item)}` : config.createLabel ?? "Create record"} onClose={() => { if (!saving) setEditor(null); }} closeOnBackdrop={!saving}><DynamicForm fields={config.fields?.(editor.item) ?? []} values={values} onValueChange={(name, value) => setValues(current => ({ ...current, [name]: value }))} onSubmit={event => { event.preventDefault(); void save(); }} errors={errors} formError={formError} submitLabel="Save changes" isSubmitting={saving} columns={2} actions={<NeumorphicButton disabled={saving} onClick={() => setEditor(null)}>Cancel</NeumorphicButton>} /></DynamicModal>}
    {statusItem && config.statusAction && <DynamicModal open title={`${config.statusAction.label(statusItem)} ${config.label(statusItem)}?`} onClose={() => { if (!saving) setStatusItem(null); }} closeOnBackdrop={!saving}>
      <p className="text-sm leading-7 text-muted">{config.statusAction.description(statusItem)}</p>
      {statusError && <RequestError message={statusError} />}
      <div className="mt-6 flex justify-end gap-3">
        <NeumorphicButton disabled={saving} onClick={() => setStatusItem(null)}>Cancel</NeumorphicButton>
        <NeumorphicButton variant="accent" disabled={saving} onClick={() => void changeStatus()}>{saving ? "Saving…" : config.statusAction.label(statusItem)}</NeumorphicButton>
      </div>
    </DynamicModal>}
    {remove && <DynamicModal open title={`${config.deleteLabel ?? "Delete"} ${config.label(remove)}?`} onClose={() => { if (!saving) setRemove(null); }} closeOnBackdrop={!saving}><p className="text-sm leading-7 text-muted">{config.deleteDescription ?? "This record will be removed. Review the selected item before continuing."}</p>{formError && <RequestError message={formError} />}<div className="mt-6 flex justify-end gap-3"><NeumorphicButton disabled={saving} onClick={() => setRemove(null)}>Cancel</NeumorphicButton><NeumorphicButton variant="accent" disabled={saving} onClick={() => void destroy()}>{saving ? "Saving…" : config.deleteLabel ?? "Delete"}</NeumorphicButton></div></DynamicModal>}
  </div>;
}
