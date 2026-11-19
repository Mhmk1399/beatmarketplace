"use client";

import { DynamicSelect } from "@/components/ui/dynamic/DynamicSelect";
import { ProducerPicker } from "@/components/admin/ProducerPicker";
import { DynamicMultiSelect } from "@/components/ui/dynamic/DynamicMultiSelect";
import {
  DynamicFileInput,
  FileUploadStatus,
} from "@/components/ui/dynamic/DynamicFileInput";
import { useFileUpload } from "@/components/ui/dynamic/useFileUpload";
import { IMAGE_MAX_BYTES, IMAGE_SOURCE_MAX_BYTES } from "@/lib/images/policy";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { DynamicModal } from "@/components/ui/dynamic/DynamicModal";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useAudioActions } from "@/components/audio/AudioPlayerProvider";
import { marketplaceAudioTrack } from "@/lib/audio/marketplace-track";
import {
  apiRequest,
  controlClass,
  errorMessage,
  Field,
  formatTime,
  RequestError,
} from "@/components/studio/shared";
import type { MarketplaceTrack, TaxonomyItem } from "@/lib/marketplace/types";
import { MUSICAL_KEY_OPTIONS, normalizeMusicalKey } from "@/lib/music/keys";

type TrackValues = {
  title: string;
  description: string;
  bpm: string;
  musicalKey: string;
  genreId: string;
  tags: string;
  previewStartSeconds: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  visibility: "PUBLIC" | "PRIVATE";
};

export function TrackEditor({
  track,
  genres,
  onClose,
  onSaved,
  admin = false,
}: {
  track: MarketplaceTrack | null;
  genres: TaxonomyItem[];
  onClose: () => void;
  onSaved: () => void;
  admin?: boolean;
}) {
  const [producerId, setProducerId] = useState(track?.producerId ?? "");
  const [moodIds, setMoodIds] = useState(track?.moodIds ?? []),
    [instrumentIds, setInstrumentIds] = useState(track?.instrumentIds ?? []);
  const [choices, setChoices] = useState<{
    moods: TaxonomyItem[];
    instruments: TaxonomyItem[];
  }>({ moods: [], instruments: [] });
  const [values, setValues] = useState<TrackValues>({
    title: track?.title ?? "",
    description: track?.description ?? "",
    bpm: String(track?.bpm ?? 120),
    musicalKey: track ? normalizeMusicalKey(track.musicalKey) ?? "" : "",
    genreId: track?.genre?.id ?? "",
    tags: track?.tags.join(", ") ?? "",
    previewStartSeconds: track?.previewStartSeconds ?? 0,
    status:
      track?.status === "SCHEDULED" ? "DRAFT" : (track?.status ?? "DRAFT"),
    visibility: track?.visibility ?? "PUBLIC",
  });
  const [master, setMaster] = useState<File | null>(null);
  const [artwork, setArtwork] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(track?.durationSeconds ?? 0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [auditioning, setAuditioning] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const uploadStatusRef = useRef<HTMLDivElement>(null);
  const globalAudio = useAudioActions();
  const toast = useToast();
  const fileUpload = useFileUpload();
  useEffect(() => {
    if (fileUpload.progress.phase === "uploading")
      uploadStatusRef.current?.scrollIntoView({
        block: "nearest",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
  }, [fileUpload.progress.phase]);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      apiRequest<{ items: TaxonomyItem[] }>("/api/taxonomy?kind=moods", {
        signal: controller.signal,
        quiet: true,
      }),
      apiRequest<{ items: TaxonomyItem[] }>("/api/taxonomy?kind=instruments", {
        signal: controller.signal,
        quiet: true,
      }),
    ])
      .then(([moods, instruments]) => {
        if (!controller.signal.aborted)
          setChoices({ moods: moods.items, instruments: instruments.items });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(errorMessage(error));
      });
    return () => controller.abort();
  }, []);
  const close = useCallback(() => {
    if (!saving) onClose();
  }, [onClose, saving]);

  useEffect(() => {
    if (!audioUrl) return;
    return () => URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  function update<K extends keyof TrackValues>(name: K, value: TrackValues[K]) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function selectMaster(file: File | null) {
    fileUpload.reset();
    audioRef.current?.pause();
    setAuditioning(false);
    setMaster(file);
    setDuration(file ? 0 : (track?.durationSeconds ?? 0));
    // The full file is auditioned locally; it is never exposed to buyers.
    setAudioUrl(file ? URL.createObjectURL(file) : null);
    update("previewStartSeconds", file ? 0 : (track?.previewStartSeconds ?? 0));
    setError("");
  }

  function changeStart(value: number) {
    audioRef.current?.pause();
    setAuditioning(false);
    update(
      "previewStartSeconds",
      Math.min(Math.max(0, value), Math.max(0, duration - 30)),
    );
  }

  async function audition() {
    const audio = audioRef.current;
    if (!audio) return;
    if (auditioning) {
      audio.pause();
      setAuditioning(false);
      return;
    }
    try {
      globalAudio.pause();
      audio.currentTime = values.previewStartSeconds;
      await audio.play();
      setAuditioning(true);
    } catch {
      setError(
        "This browser could not play the WAV. You can still upload a supported PCM WAV file.",
      );
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!master && !track) {
      setError("Choose the full WAV master before saving.");
      return;
    }
    if (master && master.size > 60 * 1024 * 1024) {
      setError("Choose a WAV master of 60 MB or smaller.");
      return;
    }
    if (artwork && artwork.size >= IMAGE_MAX_BYTES) {
      setError("Artwork must be optimized below 800 KB before saving.");
      return;
    }
    if (master && duration > 0 && duration < 30) {
      setError("The full track must be at least 30 seconds long.");
      return;
    }
    if (
      values.status === "PUBLISHED" &&
      (!values.genreId || (!artwork && !track?.artworkUrl))
    ) {
      setError(
        "Choose a genre and add artwork before publishing. You can save a draft first.",
      );
      return;
    }
    setSaving(true);
    audioRef.current?.pause();
    setAuditioning(false);
    const form = new FormData();
    if (admin && !track && !producerId) {
      setSaving(false);
      setError("Choose an active producer account.");
      return;
    }
    form.set(
      "data",
      JSON.stringify({
        ...values,
        moodIds,
        instrumentIds,
        ...(track && track.version !== undefined
          ? { expectedVersion: track.version }
          : {}),
        ...(admin && !track ? { producerId } : {}),
        bpm: Number(values.bpm),
        genreId: values.genreId || null,
        tags: values.tags
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      }),
    );
    if (master) form.set("master", master);
    if (artwork) form.set("artwork", artwork);
    try {
      const endpoint = admin ? "/api/admin/tracks" : "/api/tracks";
      const url = track ? `${endpoint}/${track.id}` : endpoint;
      if (master || artwork)
        await fileUpload.upload(url, form, track ? "PATCH" : "POST");
      else await apiRequest(url, { method: "PATCH", body: form });
      toast.success(
        values.status === "PUBLISHED" ? "Track published" : "Track saved",
        "Your selected 30-second preview is ready.",
      );
      onSaved();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DynamicModal
      open
      onClose={close}
      closeOnBackdrop={!saving}
      title={track ? "Edit track" : "Upload your next track"}
      description="Keep the full master private. Choose the 30 seconds that buyers can hear."
      size="lg"
    >
      <form onSubmit={save} className="min-w-0 space-y-6" aria-busy={saving}>
        <fieldset disabled={saving} className="min-w-0 space-y-6">
          <legend className="sr-only">Track information</legend>
          {admin && !track && (
            <ProducerPicker value={producerId} onChange={setProducerId} />
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <DynamicFileInput
              name="master"
              label="Full WAV master"
              kind="audio"
              accept=".wav,audio/wav,audio/x-wav,audio/vnd.wave"
              maxBytes={60 * 1024 * 1024}
              required={!track}
              value={master}
              onChange={selectMaster}
              disabled={saving}
              existingName={track ? "Saved WAV master" : undefined}
              hint="Uncompressed PCM WAV, at least 30 seconds. Choose your preview below."
            />
            <DynamicFileInput
              name="artwork"
              label="Artwork"
              kind="image"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              maxBytes={IMAGE_SOURCE_MAX_BYTES}
              value={artwork}
              onChange={(file) => {
                fileUpload.reset();
                setArtwork(file);
                setError("");
              }}
              disabled={saving}
              existingUrl={track?.artworkUrl}
              hint="Choose a clear cover for your beat. Required when publishing."
            />
          </div>
          <div ref={uploadStatusRef}>
            <FileUploadStatus
              progress={fileUpload.progress}
              label="Uploading beat files"
              processingLabel="Preparing your beat and preview…"
            />
          </div>

          <div className="neo-inset space-y-4 rounded-[var(--radius-control)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-bold text-[var(--text)]">
                Your 30-second preview
              </h3>
              <span className="text-sm font-semibold text-[var(--accent-text)]">
                {formatTime(values.previewStartSeconds)} —{" "}
                {formatTime(values.previewStartSeconds + 30)}
              </span>
            </div>
            <Field
              label="Preview starts at"
              hint={
                master
                  ? "Move the slider, then audition your selected section."
                  : track
                    ? "To audition a different section locally, select the original master again. Changing the start still regenerates the preview from your saved master."
                    : "Choose a master to select and audition a section."
              }
            >
              {(id) => (
                <input
                  id={id}
                  type="range"
                  min={0}
                  max={Math.max(0, Math.floor(duration - 30))}
                  step={1}
                  disabled={duration < 30}
                  value={values.previewStartSeconds}
                  onChange={(event) => changeStart(Number(event.target.value))}
                  className="min-h-8 w-full accent-[var(--accent)]"
                  aria-valuetext={`${formatTime(values.previewStartSeconds)} to ${formatTime(values.previewStartSeconds + 30)}`}
                />
              )}
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <NeumorphicButton
                size="sm"
                onClick={audition}
                disabled={!audioUrl || duration < 30}
              >
                {auditioning ? "Pause preview" : "Audition selected section"}
              </NeumorphicButton>
              {duration > 0 && (
                <span className="text-xs text-[var(--muted)]">
                  Full track: {formatTime(duration)}
                </span>
              )}
            </div>
            {audioUrl && (
              <audio
                ref={audioRef}
                src={audioUrl}
                preload="metadata"
                onLoadedMetadata={(event) => {
                  const seconds = event.currentTarget.duration;
                  if (Number.isFinite(seconds)) setDuration(seconds);
                }}
                onTimeUpdate={(event) => {
                  if (
                    event.currentTarget.currentTime >=
                    values.previewStartSeconds + 30
                  ) {
                    event.currentTarget.pause();
                    setAuditioning(false);
                  }
                }}
                onPause={() => setAuditioning(false)}
                onEnded={() => setAuditioning(false)}
                onError={() =>
                  setError(
                    "The local audio preview could not be loaded. Check that the file is an uncompressed PCM WAV.",
                  )
                }
              />
            )}
            {!master && track?.previewUrl && (
              <div>
                <p className="mb-2 text-xs text-[var(--muted)]">
                  Currently saved preview
                </p>
                <NeumorphicButton
                  size="sm"
                  onClick={() => {
                    audioRef.current?.pause();
                    setAuditioning(false);
                    globalAudio.toggle(marketplaceAudioTrack(track));
                  }}
                >
                  Play saved preview in player
                </NeumorphicButton>
              </div>
            )}
          </div>

          <Field label="Track title *">
            {(id) => (
              <input
                id={id}
                required
                maxLength={160}
                value={values.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="Give your track a name"
                className={controlClass}
              />
            )}
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="BPM *">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  required
                  min={20}
                  max={400}
                  value={values.bpm}
                  onChange={(event) => update("bpm", event.target.value)}
                  className={controlClass}
                />
              )}
            </Field>
            <Field label="Musical key *">
              {(id) => (
                <DynamicSelect
                  id={id}
                  required
                  name="musicalKey"
                  value={values.musicalKey}
                  onChange={(event) => update("musicalKey", event.target.value)}
                  className={controlClass}
                >
                  <option value="" disabled>Select musical key</option>
                  {MUSICAL_KEY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </DynamicSelect>
              )}
            </Field>
            <Field label="Genre">
              {(id) => (
                <DynamicSelect
                  id={id}
                  value={values.genreId}
                  onChange={(event) => update("genreId", event.target.value)}
                  className={controlClass}
                >
                  <option value="">Select genre</option>
                  {genres.map((genre) => (
                    <option key={genre.id} value={genre.id}>
                      {genre.name}
                    </option>
                  ))}
                </DynamicSelect>
              )}
            </Field>
          </div>
          {genres.length === 0 && (
            <p className="text-xs leading-5 text-[var(--warning-text)]">
              No active genres are available yet. An administrator can add them
              under Admin → Genres. You can save your track as a draft.
            </p>
          )}
          <Field
            label="Tags"
            hint="Separate tags with commas. Use artist, mood or instrument names to help buyers discover your track."
          >
            {(id) => (
              <input
                id={id}
                maxLength={1000}
                value={values.tags}
                onChange={(event) => update("tags", event.target.value)}
                placeholder="dark, piano, trap"
                className={controlClass}
              />
            )}
          </Field>
          <Field label="Description">
            {(id) => (
              <textarea
                id={id}
                rows={3}
                maxLength={4000}
                value={values.description}
                onChange={(event) => update("description", event.target.value)}
                className={`${controlClass} resize-y`}
              />
            )}
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Moods">
              {(id) => (
                <DynamicMultiSelect
                  id={id}
                  label="Mood"
                  options={choices.moods.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))}
                  value={moodIds}
                  onChange={setMoodIds}
                  max={10}
                />
              )}
            </Field>
            <Field label="Instruments">
              {(id) => (
                <DynamicMultiSelect
                  id={id}
                  label="Instrument"
                  options={choices.instruments.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))}
                  value={instrumentIds}
                  onChange={setInstrumentIds}
                  max={20}
                />
              )}
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Release status">
              {(id) => (
                <DynamicSelect
                  id={id}
                  value={values.status}
                  onChange={(event) =>
                    update(
                      "status",
                      event.target.value as TrackValues["status"],
                    )
                  }
                  className={controlClass}
                >
                  <option value="DRAFT">Draft — only you can see it</option>
                  <option value="PUBLISHED">Published</option>
                  {track && <option value="ARCHIVED">Archived</option>}
                </DynamicSelect>
              )}
            </Field>
            <Field label="Visibility">
              {(id) => (
                <DynamicSelect
                  id={id}
                  value={values.visibility}
                  onChange={(event) =>
                    update(
                      "visibility",
                      event.target.value as TrackValues["visibility"],
                    )
                  }
                  className={controlClass}
                >
                  <option value="PUBLIC">
                    Public — show in marketplace when published
                  </option>
                  <option value="PRIVATE">Private — only you</option>
                </DynamicSelect>
              )}
            </Field>
          </div>
        </fieldset>
        {error && <RequestError message={error} />}
        {saving && (
          <p role="status" className="text-sm text-[var(--muted)]">
            Uploading files and creating your preview. Keep this window open…
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <NeumorphicButton onClick={close} disabled={saving}>
            Cancel
          </NeumorphicButton>
          <NeumorphicButton type="submit" variant="accent" disabled={saving}>
            {saving
              ? "Saving…"
              : values.status === "PUBLISHED"
                ? "Publish track"
                : "Save track"}
          </NeumorphicButton>
        </div>
      </form>
    </DynamicModal>
  );
}
