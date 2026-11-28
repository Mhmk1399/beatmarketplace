"use client";
import { useEffect, useState } from "react";
import { apiRequest, errorMessage } from "./shared";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
type Producer = { id: string; name: string; status?: string; revenueSharePercentage?: number };
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
    [search, setSearch] = useState<{ query: string; results: Producer[]; error?: string }>(),
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
    const query = q.trim();
    if (query.length < 2) return;
    const controller = new AbortController(),
      timer = setTimeout(() => {
        void apiRequest<{ items: Producer[] }>(
          `/api/collaborations/producers?q=${encodeURIComponent(query)}`,
          { signal: controller.signal, quiet: true },
        )
          .then((data) => {
            if (!controller.signal.aborted) setSearch({ query, results: data.items });
          })
          .catch((value) => {
            if (!controller.signal.aborted) setSearch({ query, results: [], error: errorMessage(value) });
          });
      }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);
  const query = q.trim();
  const currentSearch = query.length >= 2 && search?.query === query ? search : undefined;
  const matches = currentSearch?.results.filter(item => !value.some(selected => selected.id === item.id)) ?? [];
  return (
    <section className="neo-inset space-y-3 rounded-[var(--radius-control)] p-4">
      <div>
        <h3 className="font-bold">Collaborators</h3>
        <p className="mt-1 text-xs leading-5 text-muted">
          Invite producers, then set sales shares for accepted collaborators.
          Shares apply to future orders and appear in Finances.
        </p>
      </div>
      <input
        type="search"
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder="Search producers by public name…"
        aria-label="Search producers"
        maxLength={120}
        disabled={!hydrated}
        className="neo-input-wrap min-h-12 w-full rounded-[var(--radius-control)] px-4 text-sm"
      />
      <p role="status" className="text-xs text-muted">
        {query.length < 2 ? "Type at least 2 characters to search."
          : !currentSearch ? "Searching…"
          : currentSearch.error ? currentSearch.error
          : !matches.length ? "No matching producers available to invite."
          : matches.length > 8 ? "Showing 8 matches. Refine your search for more specific results."
          : `${matches.length} match${matches.length === 1 ? "" : "es"}`}
      </p>
      <div className="max-h-52 space-y-2 overflow-y-auto">
        {matches.slice(0, 8)
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
          {item.status === "ACCEPTED" && (
            <label className="text-xs">
              Sales share %
              <input type="number" min={0} max={100} step={1}
                aria-label={`Sales share for ${item.name}`}
                className="ml-2 w-16"
                value={item.revenueSharePercentage ?? 0}
                onChange={event => onChange(value.map(selected => selected.id === item.id
                  ? { ...selected, revenueSharePercentage: Number(event.target.value) }
                  : selected))}
              />
            </label>
          )}
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
