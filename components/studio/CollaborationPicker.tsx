"use client";
import { useEffect, useState } from "react";
import { apiRequest, errorMessage } from "./shared";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
type Producer = { id: string; name: string; status?: string };
export function CollaborationPicker({
  trackId,
  value,
  onChange,
  onHydrationFailure,
}: {
  trackId?: string;
  value: Producer[];
  onChange: (value: Producer[]) => void;
  onHydrationFailure?: () => void;
}) {
  const [q, setQ] = useState(""),
    [results, setResults] = useState<Producer[]>([]),
    [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(!trackId);
  useEffect(() => {
    if (!trackId) return;
    const controller = new AbortController();
    void apiRequest<{ items: Producer[] }>(
      `/api/collaborations?ownedTrackId=${trackId}`,
      { signal: controller.signal, quiet: true },
    )
      .then((data) => {
        onChange(data.items);
        setHydrated(true);
      })
      .catch((value) => {
        if (!controller.signal.aborted) {
          setError(errorMessage(value));
          setHydrated(true);
          onHydrationFailure?.();
        }
      });
    return () => controller.abort();
  }, [trackId, onChange, onHydrationFailure]);
  useEffect(() => {
    const controller = new AbortController(),
      timer = setTimeout(() => {
        void apiRequest<{ items: Producer[] }>(
          `/api/collaborations/producers?q=${encodeURIComponent(q)}`,
          { signal: controller.signal, quiet: true },
        )
          .then((data) => setResults(data.items))
          .catch((value) => {
            if (!controller.signal.aborted) setError(errorMessage(value));
          });
      }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);
  return (
    <section className="neo-inset space-y-3 rounded-[var(--radius-control)] p-4">
      <div>
        <h3 className="font-bold">Collaborators</h3>
        <p className="mt-1 text-xs leading-5 text-muted">
          Invite active producers. Invitations do not grant editing access or
          create a payout split.
        </p>
      </div>
      <input
        type="search"
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder="Search producers by public name…"
        aria-label="Search producers"
        disabled={!hydrated}
        className="neo-input-wrap min-h-12 w-full rounded-[var(--radius-control)] px-4 text-sm"
      />
      <div className="space-y-2">
        {results
          .filter((item) => !value.some((selected) => selected.id === item.id))
          .slice(0, 8)
          .map((item) => (
            <button
              type="button"
              disabled={!hydrated}
              key={item.id}
              onClick={() =>
                onChange([...value, { ...item, status: "PENDING" }])
              }
              className="neo-button flex min-h-11 w-full items-center justify-between rounded-[var(--radius-control)] px-4 text-left text-sm"
            >
              <span>{item.name}</span>
              <span className="text-accent-text">Invite</span>
            </button>
          ))}
      </div>
      {value.map((item) => (
        <div
          key={item.id}
          className="flex min-h-11 items-center justify-between gap-3"
        >
          <span className="text-sm">
            <strong>{item.name}</strong> ·{" "}
            {item.status?.toLowerCase() || "pending"}
          </span>
          <NeumorphicButton
            size="sm"
            disabled={!hydrated}
            onClick={() =>
              onChange(value.filter((selected) => selected.id !== item.id))
            }
          >
            Remove
          </NeumorphicButton>
        </div>
      ))}
      {error && (
        <p role="alert" className="text-xs text-error-text">
          {error}
        </p>
      )}
    </section>
  );
}
