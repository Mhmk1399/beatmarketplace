"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { DashboardPageIntro } from "@/components/dashboard/DashboardPageIntro";
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
import { MusicNoteIcon, PlusIcon } from "@/components/ui/icons";
import {
  NeumorphicButton,
  NeumorphicLink,
} from "@/components/ui/neumorphic/Button";
import { NeumorphicSurface } from "@/components/ui/neumorphic/Surface";
import { useToast } from "@/components/ui/toast/ToastProvider";
import type {
  AdminHeroPlacement,
  AdminHeroResponse,
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
function localInput(value: string | number) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 19);
}
function utcInput(value: string, original?: string) {
  return original && localInput(original) === value
    ? original
    : new Date(value).toISOString();
}
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
    localInput(placement?.startsAt ?? Math.floor(discountNow() / 1000) * 1000),
  );
  const [endsAt, setEndsAt] = useState(() =>
    localInput(
      placement?.endsAt ?? Math.floor(discountNow() / 1000) * 1000 + 7 * day,
    ),
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
      startsAt: utcInput(startsAt, placement?.startsAt),
      endsAt: utcInput(endsAt, placement?.endsAt),
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
                <input
                  id={id}
                  type="datetime-local"
                  step={1}
                  required
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                  className={controlClass}
                />
              )}
            </Field>
            <Field label="Ends at *">
              {(id) => (
                <input
                  id={id}
                  type="datetime-local"
                  step={1}
                  required
                  value={endsAt}
                  onChange={(event) => setEndsAt(event.target.value)}
                  className={controlClass}
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
                    setEndsAt(localInput(start + days * day));
                }}
              >
                {days} days
              </NeumorphicButton>
            ))}
          </div>
          <p className="text-xs leading-6 text-muted">
            Timezone:{" "}
            <strong className="text-secondary">
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
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
                <select
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
                </select>
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

export function HeroWorkspace() {
  const [placements, setPlacements] = useState<AdminHeroPlacement[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<{
    placement: AdminHeroPlacement | null;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const toast = useToast();
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<AdminHeroResponse>(`/api/admin/hero?page=${page}&pageSize=24`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) {
          setPlacements(data.placements);
          setTotal(data.total);
          setHasMore(data.hasMore);
          synchronizeDiscountClock(data.serverTime);
          setError("");
        }
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(failure));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, revision]);
  const close = useCallback(() => setEditor(null), []);
  const refresh = useCallback(() => {
    setLoading(true);
    setRevision((value) => value + 1);
  }, []);
  const saved = useCallback(() => {
    setEditor(null);
    setPage(1);
    setLoading(true);
    setRevision((value) => value + 1);
  }, []);
  async function toggle(placement: AdminHeroPlacement) {
    setBusyId(placement.id);
    try {
      await apiRequest(
        `/api/admin/hero/${placement.id}`,
        placement.isActive
          ? { method: "DELETE" }
          : {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                isActive: true,
                expectedVersion: placement.version,
              }),
            },
      );
      toast.success(
        placement.isActive ? "Placement disabled" : "Placement enabled",
      );
      refresh();
    } catch (failure) {
      toast.error("Could not update placement", errorMessage(failure));
    } finally {
      setBusyId(null);
    }
  }
  return (
    <div className="space-y-7">
      <DashboardPageIntro
        eyebrow="Homepage advertising"
        title="Hero placements."
        description="Choose the beats in your homepage spotlight, schedule their display and record advertising settlement in toman."
        action={
          <NeumorphicButton
            variant="accent"
            onClick={() => setEditor({ placement: null })}
          >
            <PlusIcon className="size-4" /> Add placement
          </NeumorphicButton>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {total} {total === 1 ? "booking" : "bookings"} · up to 10 live beats
          in the hero
        </p>
        <div className="flex flex-wrap gap-2">
          <NeumorphicLink href="/" size="sm">
            View homepage
          </NeumorphicLink>
          <NeumorphicButton size="sm" onClick={refresh} disabled={loading}>
            Refresh
          </NeumorphicButton>
        </div>
      </div>
      {loading ? (
        <div
          className="neo-raised h-52 animate-pulse rounded-[var(--radius-card)]"
          role="status"
          aria-label="Loading hero placements"
        />
      ) : error ? (
        <RequestError message={error} retry={refresh} />
      ) : !placements.length ? (
        <NeumorphicSurface className="rounded-[var(--radius-card)] p-8">
          <h2 className="text-xl font-extrabold">Choose the next spotlight.</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
            Add a published producer beat, choose its display window, and record
            the advertising fee. Awaiting-payment bookings remain in this
            workspace until settled.
          </p>
          <NeumorphicButton
            className="mt-5"
            onClick={() => setEditor({ placement: null })}
          >
            Add the first placement
          </NeumorphicButton>
        </NeumorphicSurface>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-2">
          {placements.map((placement) => (
            <NeumorphicSurface
              key={placement.id}
              className="space-y-5 rounded-[var(--radius-card)] p-5 sm:p-6"
            >
              <div className="flex min-w-0 items-start gap-4">
                <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-control)] bg-surface-high">
                  {placement.artworkUrl ? (
                    <Image
                      src={placement.artworkUrl}
                      alt=""
                      fill
                      unoptimized
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <MusicNoteIcon className="size-7 text-accent-text" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent-text">
                      Position {placement.position}
                    </span>
                    <PlacementBadge placement={placement} />
                  </div>
                  <h2 className="mt-2 break-words text-lg font-extrabold">
                    {placement.trackTitle}
                  </h2>
                  <p className="mt-1 break-words text-xs text-muted">
                    {placement.producerName}
                  </p>
                </div>
              </div>
              <div className="neo-inset grid gap-4 rounded-[var(--radius-control)] p-4 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted">
                    Starts
                  </p>
                  <time
                    dateTime={placement.startsAt}
                    className="mt-1 block text-xs leading-6 text-secondary"
                  >
                    {new Date(placement.startsAt).toLocaleString()}
                  </time>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted">
                    Ends
                  </p>
                  <time
                    dateTime={placement.endsAt}
                    className="mt-1 block text-xs leading-6 text-secondary"
                  >
                    {new Date(placement.endsAt).toLocaleString()}
                  </time>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <strong className="text-accent-text">
                  {formatPrice(placement.agreedFeeToman)}
                </strong>
                <span className="text-xs text-muted">
                  {paymentLabels[placement.paymentStatus]}
                </span>
              </div>
              {!placement.trackAvailable && (
                <p className="text-xs leading-6 text-warning-text">
                  This beat is currently unavailable for advertising. Its
                  booking is retained for your records.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <NeumorphicButton
                  size="sm"
                  onClick={() => setEditor({ placement })}
                  disabled={busyId === placement.id}
                >
                  Edit placement
                </NeumorphicButton>
                <NeumorphicButton
                  size="sm"
                  variant="quiet"
                  onClick={() => void toggle(placement)}
                  disabled={busyId === placement.id}
                >
                  {busyId === placement.id
                    ? "Updating…"
                    : placement.isActive
                      ? "Disable"
                      : "Enable"}
                </NeumorphicButton>
                <Link
                  href={`/tracks/${placement.trackId}`}
                  className="ml-auto inline-flex min-h-11 items-center text-xs font-semibold text-accent-text"
                >
                  View beat →
                </Link>
              </div>
            </NeumorphicSurface>
          ))}
        </div>
      )}
      {(page > 1 || hasMore) && (
        <nav
          aria-label="Hero placement pages"
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <NeumorphicButton
            disabled={loading || page === 1}
            onClick={() => {
              setLoading(true);
              setPage((value) => value - 1);
            }}
          >
            Previous
          </NeumorphicButton>
          <span className="text-sm text-muted">
            Page {page} / {Math.max(1, Math.ceil(total / 24))}
          </span>
          <NeumorphicButton
            disabled={loading || !hasMore}
            onClick={() => {
              setLoading(true);
              setPage((value) => value + 1);
            }}
          >
            Next
          </NeumorphicButton>
        </nav>
      )}
      {editor && (
        <PlacementEditor
          key={editor.placement?.id ?? "new"}
          placement={editor.placement}
          onClose={close}
          onSaved={saved}
        />
      )}
    </div>
  );
}
