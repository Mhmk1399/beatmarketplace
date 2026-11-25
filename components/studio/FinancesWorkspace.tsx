"use client";
import { useState } from "react";
import { DashboardPageIntro } from "@/components/dashboard/DashboardPageIntro";
import { DynamicSelect } from "@/components/ui/dynamic/DynamicSelect";
import { useWorkspaceData } from "@/components/ui/dynamic/useWorkspaceData";
import { RequestError, errorMessage } from "@/components/studio/shared";
import { formatPersianDate } from "@/lib/date-time";

type Overview = { stats: { label: string; value: number; money?: boolean }[]; daily: { date: string; total: number }[] };
type Sales = { items: { id: string; total: number; createdAt: string; items: { title: string; licenseTitle: string }[] }[] };
export function FinancesWorkspace() {
  const [days, setDays] = useState("30");
  const overview = useWorkspaceData<Overview>(`/api/workspace/overview?workspace=producer&days=${days}`);
  const sales = useWorkspaceData<Sales>("/api/workspace/orders?scope=producer&status=PAID&mode=live&limit=8");
  const gross = overview.data?.daily.reduce((total, item) => total + item.total, 0) ?? 0;
  const count = overview.data?.stats.find(item => item.label === "Verified sales")?.value ?? 0;
  const error = overview.error || sales.error;
  return <div className="space-y-6"><DashboardPageIntro eyebrow="Business" title="Finances" description="Gross verified live sales for your own beat line items. This is operational reporting, not an available balance." action={<label className="min-w-40 text-xs text-muted">Reporting window<DynamicSelect className="mt-2" value={days} onChange={event => setDays(event.target.value)} options={[{ value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "90", label: "Last 90 days" }]} /></label>} />
    {error && <RequestError message={errorMessage(error)} retry={() => { void overview.refresh(); void sales.refresh(); }} />}
    <section className="workspace-summary-grid" aria-label="Finance summary"><article className="workspace-summary-card"><span>Gross sales in window</span><strong>{overview.error || (!overview.isLoading && !overview.data) ? "Unavailable" : overview.isLoading ? "Loading…" : `${gross.toLocaleString("en-US")} Toman`}</strong></article><article className="workspace-summary-card"><span>Verified orders (all time)</span><strong>{overview.error || (!overview.isLoading && !overview.data) ? "Unavailable" : overview.isLoading ? "Loading…" : count.toLocaleString("en-US")}</strong></article><article className="workspace-summary-card"><span>Reporting window</span><strong>{days} days</strong></article></section>
    <section className="neo-raised rounded-[var(--radius-card)] p-5 sm:p-7"><h2 className="text-lg font-extrabold">Recent verified sales</h2>{sales.error || (!sales.isLoading && !sales.data) ? <p className="mt-5 text-sm text-muted">Recent sales are unavailable.</p> : sales.isLoading ? <p role="status" className="mt-5 text-sm text-muted">Loading transactions…</p> : sales.data?.items.length ? <ul className="mt-5 divide-y divide-divider">{sales.data.items.map(order => <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><span><strong className="block text-sm">{order.items.length > 1 ? `${order.items.length} beat line items` : (order.items[0]?.title ?? "Beat sale")}</strong><small className="text-muted">{order.items.length === 1 && `${order.items[0].licenseTitle} · `}{formatPersianDate(order.createdAt)}</small></span><strong className="text-sm">{order.total.toLocaleString("en-US")} Toman</strong></li>)}</ul> : <p className="mt-5 text-sm text-muted">No verified live sales yet.</p>}</section>
    <section className="workspace-coming-soon"><span className="workspace-status">REPORTING ONLY</span><h2>Not implemented</h2><p className="mt-3 text-sm leading-7 text-muted">Platform fees, settlements, balances, payouts, tax documents, and withdrawal controls are not modeled. No available balance is calculated or shown.</p></section>
  </div>;
}
