"use client";

import { useState } from "react";
import { conditionRows, licenseConditions } from "@/lib/licensing/conditions";
import { formatPersianDate } from "@/lib/date-time";
import {
  ResourceManager,
  type ResourceConfig,
} from "@/components/admin/ResourceManager";
import { TableIdentity } from "@/components/ui/dynamic/DynamicTable";
import { apiRequest, controlClass, errorMessage } from "@/components/studio/shared";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { SoundKitPurchases } from "@/components/dashboard/SoundKitPurchases";
type Order = {
  id: string;
  status: string;
  total: number;
  yourShare?: number;
  gatewayMode: string;
  createdAt: string;
  referenceId?: string;
  buyer?: { email: string; name: string };
  items: {
    title: string;
    licenseTitle: string;
    price: number;
    yourShare?: number;
    settled?: boolean;
    allocations?: Allocation[];
    terms?: string;
    downloadUrl: string | null;
    downloads?: { format: string; url: string }[];
    agreementUrl?: string | null;
  }[];
};
type Allocation = { producerId: string; amount: number; reference?: string; recordedAt?: string };

function ManualSettlement({ orderId, index, share }: { orderId: string; index: number; share: Allocation }) {
  const [reference, setReference] = useState("");
  const [recorded, setRecorded] = useState(share.reference);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function record() {
    setBusy(true);
    setError("");
    try {
      await apiRequest("/api/workspace/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, itemIndex: index, producerId: share.producerId, reference }),
      });
      setRecorded(reference.trim());
    } catch (value) {
      setError(errorMessage(value));
    } finally {
      setBusy(false);
    }
  }
  return <div className="space-y-2 text-sm">
    <p>Producer {share.producerId} · {share.amount.toLocaleString("en-US")} Toman</p>
    {recorded ? <p role="status">Settled · {recorded}</p> : <>
      <label className="block">External transfer reference
        <input className={controlClass} value={reference} maxLength={160} onChange={event => setReference(event.target.value)} />
      </label>
      <button type="button" className="neo-button min-h-11 px-4" disabled={busy || reference.trim().length < 3} onClick={() => void record()}>
        {busy ? "Recording…" : "Record completed transfer"}
      </button>
    </>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
export function OrdersWorkspace({
  scope = "personal",
  downloads = false,
}: {
  scope?: "admin" | "producer" | "personal";
  downloads?: boolean;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [beat, setBeat] = useState("");
  const [license, setLicense] = useState("");
  const filters = new URLSearchParams({
    scope,
    ...(scope === "producer" || downloads ? { status: "PAID" } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(beat ? { beat } : {}),
    ...(license ? { license } : {}),
  });
  const config: ResourceConfig<Order> = {
    title:
      scope === "producer"
        ? "Sales"
        : downloads
          ? "Downloads"
          : scope === "personal"
            ? "Purchases & licenses"
            : "Orders & payments",
    description:
      scope === "producer"
        ? "Track sales you own or share. Your share is shown before fees."
        : downloads
          ? "Paid purchases with their full-quality WAV files and saved license agreements."
          : "Verified payment status and order records. Test transactions are labeled separately.",
    endpoint: "/api/workspace/orders",
    query: filters.toString(),
    searchable: scope !== "producer",
    toolbar:
      scope === "producer" ? (
        <div className="workspace-sales-filters">
          <label>
            <span>From</span>
            <input
              aria-label="Sales from date"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className={controlClass}
            />
          </label>
          <label>
            <span>To</span>
            <input
              aria-label="Sales to date"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
              className={controlClass}
            />
          </label>
          <label>
            <span>Beat</span>
            <input
              aria-label="Filter by beat"
              value={beat}
              onChange={(event) => setBeat(event.target.value)}
              maxLength={160}
              placeholder="Beat title"
              className={controlClass}
            />
          </label>
          <label>
            <span>License</span>
            <input
              aria-label="Filter by license"
              value={license}
              onChange={(event) => setLicense(event.target.value)}
              maxLength={160}
              placeholder="License name"
              className={controlClass}
            />
          </label>
          <NeumorphicLink
            href={`/api/workspace/orders?${new URLSearchParams({ ...Object.fromEntries(filters), format: "csv" })}`}
            size="sm"
          >
            Export CSV
          </NeumorphicLink>
        </div>
      ) : undefined,
    label: (order) => `Order ${order.id.slice(-8)}`,
    columns: [
      {
        id: "order",
        header: "Order",
        cell: (order) => (
          <TableIdentity
            title={order.items[0]?.title ?? `Order ${order.id.slice(-8)}`}
            subtitle={order.buyer?.email ?? `#${order.id.slice(-8)}`}
          />
        ),
      },
      {
        id: "amount",
        header: scope === "producer" ? "Gross sale" : "Amount",
        cell: (order) => `${order.total.toLocaleString("en-US")} Toman`,
      },
      ...(scope === "producer" ? [{
        id: "share", header: "Your share",
        cell: (order: Order) => `${(order.yourShare ?? 0).toLocaleString("en-US")} Toman`,
      }] : []),
      {
        id: "status",
        header: "Payment",
        cell: (order) => (
          <span className="workspace-status">
            {order.status}
            {order.gatewayMode === "sandbox" ? " · TEST" : ""}
          </span>
        ),
      },
      {
        id: "date",
        header: "Date",
        cell: (order) => formatPersianDate(order.createdAt),
      },
    ],
    details: (order) => (
      <div className="space-y-5">
        <p className="text-sm">
          {order.status}
          {order.gatewayMode === "sandbox" ? " · Test transaction" : ""} ·{" "}
          {order.total.toLocaleString("en-US")} Toman
        </p>
        {order.buyer && (
          <p className="text-sm text-muted">
            {order.buyer.name} · {order.buyer.email}
          </p>
        )}
        {order.items.map((item, index) => (
          <article
            key={index}
            className="neo-inset space-y-3 rounded-[var(--radius-control)] p-4"
          >
            <h3 className="font-bold">{item.title}</h3>
            <p className="text-sm text-muted">
              {item.licenseTitle} · {item.price.toLocaleString("en-US")} Toman
            </p>
            {scope === "producer" && <p className="text-sm">
              Your share: {(item.yourShare ?? 0).toLocaleString("en-US")} Toman
              {item.settled ? " · Settled" : order.gatewayMode === "live" && (item.yourShare ?? 0) > 0 ? " · Unsettled" : ""}
            </p>}
            {!!item.allocations?.length && <section className="space-y-3" aria-label="Manual settlements">
              <p className="text-sm text-muted">Record transfers after they have been completed outside BeatMarketplace.</p>
              {item.allocations.map(share => <ManualSettlement key={share.producerId} orderId={order.id} index={index} share={share} />)}
            </section>}
            {item.terms && (
              <details>
                <summary className="min-h-11 cursor-pointer text-sm font-semibold text-accent-muted">
                  Purchased license terms
                </summary>
                <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-muted">
                  {formatTerms(item.terms)}
                </pre>
              </details>
            )}
            {item.agreementUrl && (
              <div className="flex flex-wrap gap-4">
                <a
                  href={item.agreementUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center font-semibold text-accent-text underline"
                >
                  View agreement
                </a>
                <a
                  href={`${item.agreementUrl}&download=1`}
                  className="inline-flex min-h-11 items-center font-semibold text-accent-text underline"
                >
                  Download agreement
                </a>
              </div>
            )}
            {(item.downloads?.length
              ? item.downloads
              : item.downloadUrl
                ? [{ format: "WAV", url: item.downloadUrl }]
                : []
            ).map((file) => (
              <a
                key={file.format}
                href={file.url}
                className="neo-button neo-button-accent mr-2 inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-4 text-sm font-bold"
              >
                Download {file.format === "STEMS" ? "stems ZIP" : file.format}
              </a>
            ))}
          </article>
        ))}
        {order.referenceId && (
          <p className="break-all text-xs text-muted">
            Payment reference: {order.referenceId}
          </p>
        )}
      </div>
    ),
  };
  return (
    <div className="space-y-6">
      <ResourceManager config={config} />
      {scope === "personal" && <SoundKitPurchases downloads={downloads} />}
    </div>
  );
}
function formatTerms(value: string) {
  try {
    const saved = JSON.parse(value);
    if (!saved.terms || !saved.title) return value;
    return [
      saved.title,
      `License version: ${saved.version}`,
      `Type: ${saved.terms.licenseType}`,
      saved.description || "",
      ...conditionRows(licenseConditions(saved.terms, saved.territory)).map(
        ([key, value]) => `${key}: ${value}`,
      ),
      `Files included: ${(saved.filesToDeliver ?? []).map((file: { format: string }) => file.format).join(" + ")}`,
      "Additional producer terms:",
      saved.terms.customTerms || "None.",
    ]
      .filter(Boolean)
      .join("\n");
  } catch {
    return value;
  }
}
