"use client";
import { useCallback, useEffect, useState } from "react";
import { apiRequest, errorMessage, RequestError } from "./shared";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { NeumorphicSurface } from "@/components/ui/neumorphic/Surface";
type Invitation = {
  trackId: string;
  title: string;
  ownerName: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  invitedAt: string;
  respondedAt?: string;
};
export function CollaborationsWorkspace() {
  const [items, setItems] = useState<Invitation[] | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    try {
      setItems(
        (await apiRequest<{ items: Invitation[] }>("/api/collaborations"))
          .items,
      );
      setError("");
    } catch (value) {
      setError(errorMessage(value));
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);
  async function answer(item: Invitation, action: "ACCEPTED" | "DECLINED") {
    setBusy(item.trackId);
    try {
      await apiRequest(`/api/collaborations/${item.trackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await load();
    } catch (value) {
      setError(errorMessage(value));
    } finally {
      setBusy("");
    }
  }
  return (
    <NeumorphicSurface className="rounded-[var(--radius-card)] p-5 sm:p-7">
      <h1 className="text-2xl font-extrabold">Collaborations</h1>
      <p className="mt-2 mb-6 text-sm text-muted">
        Review invitations to be credited on another producer’s track. Accepting
        does not grant editing access or create a payout split.
      </p>
      {error && <RequestError message={error} retry={() => void load()} />}{" "}
      {!items && error ? null : !items ? (
        <p role="status" className="text-sm text-muted">
          Loading invitations…
        </p>
      ) : items?.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.trackId}
              className="neo-inset rounded-[var(--radius-control)] p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-bold">{item.title}</h2>
                  <p className="text-sm text-muted">
                    Invited by {item.ownerName} ·{" "}
                    <span className="workspace-status">{item.status}</span>
                  </p>
                </div>
                {item.status === "PENDING" && (
                  <div className="flex gap-2">
                    <NeumorphicButton
                      disabled={busy === item.trackId}
                      onClick={() => void answer(item, "DECLINED")}
                    >
                      Decline
                    </NeumorphicButton>
                    <NeumorphicButton
                      variant="accent"
                      disabled={busy === item.trackId}
                      onClick={() => void answer(item, "ACCEPTED")}
                    >
                      Accept
                    </NeumorphicButton>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">No collaboration invitations yet.</p>
      )}
    </NeumorphicSurface>
  );
}
