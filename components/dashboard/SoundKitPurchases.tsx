"use client";
import { useEffect, useState } from "react";
import { formatPersianDate } from "@/lib/date-time";
import { formatFileSize } from "@/lib/uploads/files";
import {
  apiRequest,
  errorMessage,
  RequestError,
} from "@/components/studio/shared";
import { NeumorphicSurface } from "@/components/ui/neumorphic/Surface";
type KitOrder = {
  id: string;
  title: string;
  price: number;
  status: string;
  gatewayMode: string;
  assetName: string;
  assetSizeBytes: number;
  createdAt: string;
  downloadUrl: string | null;
};
export function SoundKitPurchases({
  downloads = false,
}: {
  downloads?: boolean;
}) {
  const [orders, setOrders] = useState<KitOrder[] | null>(null),
    [error, setError] = useState("");
  const [next, setNext] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const endpoint = `/api/sound-kits/orders?paid=${downloads ? "1" : "0"}`;
  useEffect(() => {
    let active = true;
    void apiRequest<{ orders: KitOrder[]; next: string | null }>(endpoint)
      .then((result) => {
        if (active) setNext(result.next);
        if (active)
          setOrders(
            result.orders.filter(
              (order) => !downloads || Boolean(order.downloadUrl),
            ),
          );
      })
      .catch((value) => {
        if (active) setError(errorMessage(value));
      });
    return () => {
      active = false;
    };
  }, [downloads, endpoint]);
  async function loadMore() {
    if (!next || loadingMore) return;
    setLoadingMore(true);
    setError("");
    try {
      const page = await apiRequest<{ orders: KitOrder[]; next: string | null }>(`${endpoint}&before=${encodeURIComponent(next)}`);
      setOrders(current => [...(current ?? []), ...page.orders]);
      setNext(page.next);
    } catch (value) {
      setError(errorMessage(value));
    } finally {
      setLoadingMore(false);
    }
  }
  return (
    <NeumorphicSurface className="rounded-[var(--radius-card)] p-5 sm:p-7">
      <h2 className="text-xl font-extrabold">Sound kits</h2>
      <p className="mt-2 mb-5 text-sm text-muted">
        Purchased ZIP archives remain available here with the exact file version
        paid for.
      </p>
      {error && <RequestError message={error} />}
      {orders === null && !error ? (
        <p role="status" className="text-sm text-muted">
          Loading sound kits…
        </p>
      ) : orders?.length ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <article
              key={order.id}
              className="neo-inset flex flex-col gap-3 rounded-[var(--radius-control)] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h3 className="font-bold">{order.title}</h3>
                <p className="text-xs leading-6 text-muted">
                  {order.assetName} · {formatFileSize(order.assetSizeBytes)} ·{" "}
                  {formatPersianDate(order.createdAt)} · {order.status}
                  {order.gatewayMode === "sandbox" ? " · TEST" : ""}
                </p>
              </div>
              {order.downloadUrl ? (
                <a
                  href={order.downloadUrl}
                  className="neo-button neo-button-accent inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] px-4 text-sm font-bold"
                >
                  Download ZIP
                </a>
              ) : (
                <span className="workspace-status">
                  {order.price.toLocaleString("en-US")} Toman
                </span>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">No sound kit purchases yet.</p>
      )}
      {next && <button type="button" className="neo-button mt-4 min-h-11 px-4" disabled={loadingMore} onClick={() => void loadMore()}>Load older purchases</button>}
    </NeumorphicSurface>
  );
}
