"use client";

import { conditionRows, licenseConditions } from "@/lib/licensing/conditions";
import { formatPersianDate } from "@/lib/date-time";
import {
  ResourceManager,
  type ResourceConfig,
} from "@/components/admin/ResourceManager";
import { TableIdentity } from "@/components/ui/dynamic/DynamicTable";
type Order = {
  id: string;
  status: string;
  total: number;
  gatewayMode: string;
  createdAt: string;
  referenceId?: string;
  buyer?: { email: string; name: string };
  items: {
    title: string;
    licenseTitle: string;
    price: number;
    terms?: string;
    downloadUrl: string | null;
    agreementUrl?: string | null;
  }[];
};
export function OrdersWorkspace({
  scope = "personal",
  downloads = false,
}: {
  scope?: "admin" | "producer" | "personal";
  downloads?: boolean;
}) {
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
        ? "Sales of your beats. Amounts are gross sales before any settlement or platform fees."
        : downloads
          ? "Paid purchases with their full-quality WAV files and saved license agreements."
        : "Verified payment status and order records. Test transactions are labeled separately.",
    endpoint: "/api/workspace/orders",
    query: `scope=${scope}${scope === "producer" || downloads ? "&status=PAID" : ""}`,
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
        header: "Amount",
        cell: (order) => `${order.total.toLocaleString("en-US")} Toman`,
      },
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
            {item.agreementUrl && <div className="flex flex-wrap gap-4"><a href={item.agreementUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold text-accent-text underline">View agreement</a><a href={`${item.agreementUrl}&download=1`} className="inline-flex min-h-11 items-center font-semibold text-accent-text underline">Download agreement</a></div>}
            {item.downloadUrl && (
              <a
                href={item.downloadUrl}
                className="neo-button neo-button-accent inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-4 text-sm font-bold"
              >
                Download WAV
              </a>
            )}
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
  return <ResourceManager config={config} />;
}
function formatTerms(value: string) {
  try {
    const saved = JSON.parse(value);
    if (!saved.terms || !saved.title) return value;
    return [saved.title, `License version: ${saved.version}`, `Type: ${saved.terms.licenseType}`, saved.description || "", ...conditionRows(licenseConditions(saved.terms, saved.territory)).map(([key,value])=>`${key}: ${value}`), `Files included: ${(saved.filesToDeliver ?? []).map((file: {format:string})=>file.format).join(" + ")}`, "Additional producer terms:", saved.terms.customTerms || "None."].filter(Boolean).join("\n");
  } catch {
    return value;
  }
}
