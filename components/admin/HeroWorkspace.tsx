"use client";

import { formatPersianDate, formatPersianDateTime } from "@/lib/date-time";

import { DynamicSelect } from "@/components/ui/dynamic/DynamicSelect";
import { DynamicDateTimePicker } from "@/components/ui/dynamic/DynamicDateTimePicker";



import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ResourceManager, type ResourceConfig } from "./ResourceManager";
import { TableIdentity } from "@/components/ui/dynamic/DynamicTable";
import {
  discountNow,
  synchronizeDiscountClock,
  useDiscountSecond,
} from "@/components/discounts/clock";
import { formatPrice } from "@/components/marketplace/MarketplaceProvider";
import {
  apiRequest,
  controlClass,
  errorMessage,
  Field,
  RequestError,
} from "@/components/studio/shared";
import { DynamicModal } from "@/components/ui/dynamic/DynamicModal";

import {
  NeumorphicButton,

} from "@/components/ui/neumorphic/Button";

import { useToast } from "@/components/ui/toast/ToastProvider";
import type {
  AdminHeroPlacement,

  HeroPaymentStatus,
} from "@/lib/hero/types";
import {
  MAX_HERO_WINDOW_DAYS,
  validateHeroBooking,
} from "@/lib/hero/validation";
import type { MarketplaceTrack } from "@/lib/marketplace/types";

const day = 86_400_000;
const paymentLabels: Record<HeroPaymentStatus, string> = {
  PENDING: "Awaiting payment",
  PAID: "Paid",
  COMPLIMENTARY: "Complimentary",
};
function eligibleCandidate(track: MarketplaceTrack) {
  return Boolean(
    track.artworkUrl &&
    track.previewUrl &&
    (track.hasMoreLicenses ||
      track.licenses.some(
        (license) =>
          license.licenseType === "NON_EXCLUSIVE" &&
          license.formats.length > 0 &&
          license.formats.every((format) => format === "WAV") &&
          Number(license.originalPrice ?? license.price) >= 1000,
      )),
  );
}

function PlacementBadge({ placement }: { placement: AdminHeroPlacement }) {
  const now = useDiscountSecond();
  const state = !placement.isActive
    ? "Disabled"
    : Date.parse(placement.endsAt) <= now
      ? "Ended"
      : placement.paymentStatus === "PENDING"
        ? "Awaiting payment"
        : !placement.trackAvailable
          ? "Track unavailable"
          : Date.parse(placement.startsAt) > now
            ? "Scheduled"
            : "Active window";
  const tone =
    state === "Active window"
      ? "text-success-text bg-success/10"
      : state === "Track unavailable"
        ? "text-error-text bg-error/10"
        : "text-accent-text bg-accent/10";
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-bold ${tone}`}
    >
      {state}
    </span>
  );
}

function TrackPicker({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (track: MarketplaceTrack) => void;
}) {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<MarketplaceTrack[]>([]);
  const [history, setHistory] = useState([""]);
  const [page, setPage] = useState(0);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const cursor = history[page] ?? "";
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          pagination: "cursor",
          pageSize: "8",
          sort: "newest",
          ...(query.trim() ? { q: query.trim() } : {}),
          ...(cursor ? { cursor } : {}),
        });
        const data = await apiRequest<{
          tracks: MarketplaceTrack[];
          nextCursor: string | null;
        }>(`/api/tracks?${params}`, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setTracks(data.tracks);
          setNext(data.nextCursor);
          setError("");
        }
      } catch (failure) {
        if (!controller.signal.aborted) setError(errorMessage(failure));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, cursor, revision]);
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 text-sm font-semibold text-secondary">
        Choose a public beat *
      </legend>
      <input
        type="search"
        aria-label="Search beats for hero"
        maxLength={160}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setLoading(true);
          setHistory([""]);
          setPage(0);
        }}
        placeholder="Search by beat, producer or tag…"
        className={controlClass}
      />
      <div
        className="neo-inset max-h-72 space-y-1 overflow-y-auto rounded-[var(--radius-control)] p-2"
        aria-busy={loading}
      >
        {loading ? (
          <p className="p-4 text-sm text-muted">Finding beats…</p>
        ) : error ? (
          <RequestError
            message={error}
            retry={() => {
              setLoading(true);
              setRevision((value) => value + 1);
            }}
          />
        ) : !tracks.length ? (
          <p className="p-4 text-sm text-muted">
            No public beats match this search.
          </p>
        ) : (
          tracks.map((track) => {
            const eligible = eligibleCandidate(track);
            return (
              <label
                key={track.id}
                className={`flex min-h-16 items-center gap-3 rounded-[var(--radius-control)] p-3 text-sm ${eligible ? "cursor-pointer hover:bg-[var(--hover-overlay)]" : "opacity-55"}`}
              >
                <input
                  type="radio"
                  name="hero-track"
                  value={track.id}
                  checked={selectedId === track.id}
                  disabled={!eligible}
                  onChange={() => onSelect(track)}
                  className="size-4 shrink-0 accent-accent"
                />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate">{track.title}</strong>
                  <span className="mt-1 block truncate text-xs text-muted">
                    {track.producerName} ·{" "}
                    {eligible
                      ? "Published beat"
                      : "Needs artwork, preview and an active WAV license"}
                  </span>
                </span>
              </label>
            );
          })
        )}
      </div>
      {(page > 0 || next) && (
        <div className="flex items-center justify-between gap-3">
          <NeumorphicButton
            size="sm"
            disabled={loading || page === 0}
            onClick={() => {
              setLoading(true);
              setPage((value) => value - 1);
            }}
          >
            Previous beats
          </NeumorphicButton>
          <span className="text-xs text-muted">Page {page + 1}</span>
          <NeumorphicButton
            size="sm"
            disabled={loading || !next}
            onClick={() => {
              if (next) {
                setHistory((items) => [...items.slice(0, page + 1), next]);
                setPage((value) => value + 1);
                setLoading(true);
              }
            }}
          >
            Next beats
          </NeumorphicButton>
        </div>
      )}
    </fieldset>
  );
}

function PlacementEditor({
  placement,
  onClose,
  onSaved,
}: {
  placement: AdminHeroPlacement | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<MarketplaceTrack | null>(null);
  const [position, setPosition] = useState(placement?.position ?? 0);
  const [label, setLabel] = useState(placement?.label ?? "Featured");
  const [startsAt, setStartsAt] = useState(() =>
    placement?.startsAt ?? new Date(Math.floor(discountNow() / 1000) * 1000).toISOString(),
  );
  const [endsAt, setEndsAt] = useState(() =>
    placement?.endsAt ?? new Date(Math.floor(discountNow() / 1000) * 1000 + 7 * day).toISOString(),
  );
  const [fee, setFee] = useState(String(placement?.agreedFeeToman ?? 0));
  const [paymentStatus, setPaymentStatus] = useState<HeroPaymentStatus>(
    placement?.paymentStatus ?? "PENDING",
  );
  const [paymentReference, setPaymentReference] = useState(
    placement?.paymentReference ?? "",
  );
  const [isActive, setIsActive] = useState(placement?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const close = useCallback(() => {
    if (!saving) onClose();
  }, [onClose, saving]);
  const toast = useToast();
  const trackId = selected?.id ?? placement?.trackId ?? "";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!trackId) {
      setError("Choose a beat for this placement.");
      return;
    }
    if (
      !Number.isFinite(Date.parse(startsAt)) ||
      !Number.isFinite(Date.parse(endsAt))
    ) {
      setError("Choose valid start and end times.");
      return;
    }
    const values = {
      trackId,
      position,
      label: label.trim() || "Featured",
      startsAt,
      endsAt,
      agreedFeeToman: Number(fee),
      paymentStatus,
      paymentReference: paymentReference.trim(),
      isActive,
    };
    const invalid = validateHeroBooking(
      {
        ...values,
        startsAt: new Date(values.startsAt),
        endsAt: new Date(values.endsAt),
      },
      new Date(discountNow()),
      !placement,
    );
    if (invalid) {
      setError(invalid);
      return;
    }
    const current = placement as unknown as Record<string, unknown> | null;
    const changes = placement
      ? Object.fromEntries(
          Object.entries(values).filter(
            ([key, value]) => value !== current?.[key],
          ),
        )
      : values;
    if (placement && Object.keys(changes).length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      const result = await apiRequest<{ serverTime?: string }>(
        placement ? `/api/admin/hero/${placement.id}` : "/api/admin/hero",
        {
          method: placement ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...changes,
            ...(placement ? { expectedVersion: placement.version } : {}),
          }),
        },
      );
      synchronizeDiscountClock(result.serverTime);
      toast.success(
        "Hero placement saved",
        "Your schedule and settlement status control when it appears.",
      );
      onSaved();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  }
  return (
    <DynamicModal
      open
      onClose={close}
      closeOnBackdrop={!saving}
      title={placement ? "Edit hero placement" : "Add hero placement"}
      description="Choose a producer’s beat and manage its sponsored time in the homepage hero."
      size="lg"
    >
      <form onSubmit={submit} className="space-y-6" aria-busy={saving}>
        <fieldset disabled={saving} className="space-y-6">
          <legend className="sr-only">Hero placement details</legend>
          {placement && (
            <div className="neo-inset rounded-[var(--radius-control)] p-4">
              <p className="text-xs text-muted">Selected beat</p>
              <strong className="mt-2 block break-words">
                {selected?.title ?? placement.trackTitle}
              </strong>
              <p className="mt-1 text-xs text-muted">
                {selected?.producerName ?? placement.producerName}
              </p>
            </div>
          )}
          {placement ? (
            <details className="rounded-[var(--radius-control)] border border-divider p-4">
              <summary className="min-h-8 cursor-pointer text-sm font-semibold text-accent-text">
                Choose a different beat
              </summary>
              <div className="mt-4">
                <TrackPicker selectedId={trackId} onSelect={setSelected} />
              </div>
            </details>
          ) : (
            <TrackPicker selectedId={trackId} onSelect={setSelected} />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Display order *"
              hint="Lower numbers appear first. At most 10 eligible bookings display together."
            >
              {(id) => (
                <input
                  id={id}
                  required
                  type="number"
                  min={0}
                  max={10000}
                  step={1}
                  value={position}
                  onChange={(event) => setPosition(Number(event.target.value))}
                  className={controlClass}
                />
              )}
            </Field>
            <Field
              label="Card label"
              hint="The Sponsored disclosure remains visible on every placement."
            >
              {(id) => (
                <input
                  id={id}
                  maxLength={40}
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  className={controlClass}
                />
              )}
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts at *">
              {(id) => (
                <DynamicDateTimePicker
                  id={id}
                  showSeconds
                  required
                  value={startsAt}
                  onValueChange={setStartsAt}
                />
              )}
            </Field>
            <Field label="Ends at *">
              {(id) => (
                <DynamicDateTimePicker
                  id={id}
                  showSeconds
                  required
                  value={endsAt}
                  min={startsAt}
                  onValueChange={setEndsAt}
                />
              )}
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            {[7, 14, 30].map((days) => (
              <NeumorphicButton
                key={days}
                size="sm"
                onClick={() => {
                  const start = Date.parse(startsAt);
                  if (Number.isFinite(start))
                    setEndsAt(new Date(start + days * day).toISOString());
                }}
              >
                {days} days
              </NeumorphicButton>
            ))}
          </div>
          <p className="text-xs leading-6 text-muted">
            Timezone:{" "}
            <strong className="text-secondary">
              Asia/Tehran · تقویم شمسی، ساعت تهران
            </strong>
            . Bookings may run for up to {MAX_HERO_WINDOW_DAYS} days.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Advertising fee (toman) *">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  required
                  min={paymentStatus === "PAID" ? 1 : 0}
                  max={1000000000}
                  step={1}
                  value={fee}
                  onChange={(event) => setFee(event.target.value)}
                  className={controlClass}
                />
              )}
            </Field>
            <Field
              label="Settlement status *"
              hint="After collecting the fee, mark the booking as Paid."
            >
              {(id) => (
                <DynamicSelect
                  id={id}
                  value={paymentStatus}
                  onChange={(event) =>
                    setPaymentStatus(event.target.value as HeroPaymentStatus)
                  }
                  className={controlClass}
                >
                  {Object.entries(paymentLabels).map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </DynamicSelect>
              )}
            </Field>
          </div>
          <Field label="Payment reference (optional)">
            {(id) => (
              <input
                id={id}
                maxLength={160}
                value={paymentReference}
                onChange={(event) => setPaymentReference(event.target.value)}
                placeholder="Invoice or bank reference"
                className={controlClass}
              />
            )}
          </Field>
          <label className="neo-inset flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] p-4 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="size-4 accent-accent"
            />
            <span>Placement enabled</span>
          </label>
          <p className="rounded-[var(--radius-control)] border border-divider p-4 text-xs leading-6 text-muted">
            Enabled, settled or complimentary bookings appear during their
            schedule. The beat must remain public, with its cover, preview and
            purchasable WAV license.
          </p>
        </fieldset>
        {error && <RequestError message={error} />}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <NeumorphicButton disabled={saving} onClick={close}>
            Cancel
          </NeumorphicButton>
          <NeumorphicButton
            type="submit"
            variant="accent"
            disabled={saving || !trackId}
          >
            {saving ? "Saving…" : "Save placement"}
          </NeumorphicButton>
        </div>
      </form>
    </DynamicModal>
  );
}


export function HeroWorkspace() { const config: ResourceConfig<AdminHeroPlacement> = { title: "Hero placements", description: "Select sponsored beats, schedule their display and record advertising fees in Toman.", endpoint: "/api/admin/hero", itemsKey: "placements", pagination: "offset", searchable: false, label: item => item.trackTitle, canCreate: true, canEdit: true, canDelete: true, createLabel: "Add placement", deleteLabel: "Disable", deleteDescription: "This stops the placement from appearing in the homepage hero. The booking record is retained.", columns: [{ id: "beat", header: "Beat", cell: item => <TableIdentity image={item.artworkUrl} title={item.trackTitle} subtitle={item.producerName} /> }, { id: "position", header: "Position", accessor: "position" }, { id: "ends", header: "Ends", cell: item => formatPersianDate(item.endsAt) }, { id: "status", header: "Status", cell: item => <PlacementBadge placement={item} /> }, { id: "fee", header: "Advertising fee", cell: item => formatPrice(item.agreedFeeToman) }], editor: ({ item, onClose, onSaved }) => <PlacementEditor placement={item} onClose={onClose} onSaved={onSaved} />, details: item => <div className="space-y-4"><TableIdentity image={item.artworkUrl} title={item.trackTitle} subtitle={item.producerName} /><PlacementBadge placement={item} /><p className="text-sm">Starts: {formatPersianDateTime(item.startsAt)}</p><p className="text-sm">Ends: {formatPersianDateTime(item.endsAt)}</p><p className="text-sm">{formatPrice(item.agreedFeeToman)} | {paymentLabels[item.paymentStatus]}</p><p className="break-words text-xs text-muted">{item.paymentReference || "No payment reference recorded."}</p></div> }; return <ResourceManager config={config} />; }
