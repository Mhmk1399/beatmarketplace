"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { CheckIcon, CloseIcon, MusicNoteIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { formatFileSize, validateSelectedFile } from "@/lib/uploads/files";
import type { FileUploadProgress } from "@/lib/uploads/transport";
import { uploadStageLabels } from "@/lib/uploads/protocol";

type Props = {
  id?: string;
  name?: string;
  label: string;
  kind: "audio" | "image" | "file";
  value: File | null;
  onChange: (file: File | null) => void;
  accept: string;
  maxBytes: number;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  existingUrl?: string | null;
  existingName?: string;
  error?: string;
  progress?: FileUploadProgress;
  onRetry?: () => void;
};

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <path
        d="M12 16V4m-4 4 4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function PictureIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path
        d="m4 17 5-5 4 4 3-3 5 5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FileUploadStatus({
  progress,
  label = "Uploading your files",
  processingLabel = "Preparing your files…",
  onRetry,
}: {
  progress: FileUploadProgress;
  label?: string;
  processingLabel?: string;
  onRetry?: () => void;
}) {
  if (progress.phase === "idle") return null;
  const busy =
      progress.phase === "preparing" ||
      progress.phase === "uploading" ||
      progress.phase === "processing",
    preparing = progress.phase === "preparing",
    processing = preparing || progress.phase === "processing",
    failed = progress.phase === "error" || progress.phase === "cancelled";
  const title = preparing
    ? "Optimizing image…"
    : processing
      ? progress.stage
        ? uploadStageLabels[progress.stage]
        : processingLabel
      : progress.phase === "success"
        ? "Upload complete"
        : failed
          ? progress.stage
            ? `Stopped: ${uploadStageLabels[progress.stage].replace(/…$/, "")}`
            : "Upload interrupted"
          : label;
  return (
    <div
      className="file-upload-status"
      data-phase={progress.phase}
      aria-busy={busy}
    >
      <div className="file-upload-status-heading">
        <span className="file-upload-status-label">
          {progress.phase === "success" ? (
            <CheckIcon />
          ) : busy ? (
            <span className="file-upload-frequency" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((index) => (
                <i
                  key={index}
                  style={{ animationDelay: `${index * -0.13}s` }}
                />
              ))}
            </span>
          ) : (
            <CloseIcon />
          )}
          <span role="status">{title}</span>
        </span>
        <strong aria-hidden="true">
          {preparing
            ? "WebP"
            : processing
              ? "Working"
              : progress.percent !== null
                ? `${progress.percent}%`
                : "…"}
        </strong>
      </div>
      <div
        className="file-upload-progress"
        role="progressbar"
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={
          !processing && progress.percent !== null
            ? progress.percent
            : undefined
        }
        aria-valuetext={
          preparing
            ? "Converting to WebP below 800 KB before upload."
            : processing
              ? progress.stage
                ? uploadStageLabels[progress.stage]
                : "Files sent. Preparing your upload."
              : undefined
        }
        data-indeterminate={processing || progress.percent === null}
      >
        <span
          style={
            !processing && progress.percent !== null
              ? { width: `${progress.percent}%` }
              : undefined
          }
        />
      </div>
      <div className="file-upload-status-detail">
        <span>
          {preparing
            ? "Preparing a smaller image before upload."
            : processing
              ? "Please keep this window open."
              : progress.phase === "success"
                ? "Your file is saved and ready."
                : failed
                  ? "Your selected file is still here."
                  : progress.total
                    ? `${formatFileSize(progress.loaded)} of ${formatFileSize(progress.total)}`
                    : "Sending your files…"}
        </span>
        {failed && onRetry && (
          <NeumorphicButton size="sm" onClick={onRetry}>
            Try upload again
          </NeumorphicButton>
        )}
      </div>
    </div>
  );
}

export function DynamicFileInput({
  id: suppliedId,
  name,
  label,
  kind,
  value,
  onChange,
  accept,
  maxBytes,
  hint,
  required,
  disabled,
  existingUrl,
  existingName,
  error,
  progress,
  onRetry,
}: Props) {
  const generatedId = useId(),
    id = suppliedId ?? `file-${generatedId}`;
  const native = useRef<HTMLInputElement>(null),
    browse = useRef<HTMLButtonElement>(null),
    depth = useRef(0);
  const [dragging, setDragging] = useState(false),
    [selectionError, setSelectionError] = useState("");
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(
    null,
  );
  const [preparing, setPreparing] = useState(false);
  const preparation = useRef<{
    controller: AbortController;
    generation: number;
  } | null>(null);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
      preparation.current?.controller.abort();
      preparation.current = null;
    },
    [],
  );
  useEffect(() => {
    const form = native.current?.form;
    if (!form) return;
    const guard = (event: Event) => {
      if (!preparation.current) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setSelectionError(
        "Your image is being optimized. Please wait a moment before saving.",
      );
    };
    form.addEventListener("submit", guard, true);
    return () => form.removeEventListener("submit", guard, true);
  }, []);
  const busy =
      preparing ||
      progress?.phase === "preparing" ||
      progress?.phase === "uploading" ||
      progress?.phase === "processing",
    unavailable = disabled || busy;
  useEffect(() => {
    let disposed = false,
      url: string | undefined;
    void Promise.resolve().then(() => {
      if (disposed) return;
      if (value && kind === "image") {
        url = URL.createObjectURL(value);
        setPreview({ file: value, url });
      } else setPreview(null);
    });
    return () => {
      disposed = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [value, kind]);
  async function choose(file: File | null) {
    if (unavailable || native.current?.matches(":disabled")) return;
    if (file) {
      const issue = validateSelectedFile(file, accept, maxBytes);
      if (issue) {
        setSelectionError(issue);
        if (native.current) native.current.value = "";
        return;
      }
    }
    setSelectionError("");
    if (file && kind === "image") {
      const controller = new AbortController(),
        job = ++generation.current;
      preparation.current = { controller, generation: job };
      setPreparing(true);
      try {
        const { optimizeImageFile } =
          await import("@/lib/uploads/optimize-image");
        const optimized = await optimizeImageFile(file, {
          signal: controller.signal,
        });
        if (controller.signal.aborted || generation.current !== job) return;
        if (native.current) {
          try {
            const transfer = new DataTransfer();
            transfer.items.add(optimized);
            native.current.files = transfer.files;
          } catch {
            native.current.value = "";
          }
        }
        setSelectionError("");
        onChange(optimized);
      } catch (error) {
        if (!controller.signal.aborted && generation.current === job) {
          setSelectionError(
            error instanceof Error
              ? error.message
              : "This image could not be prepared.",
          );
          if (native.current) native.current.value = "";
        }
      } finally {
        if (generation.current === job) {
          preparation.current = null;
          setPreparing(false);
        }
      }
    } else {
      onChange(file);
      if (!file && native.current) native.current.value = "";
    }
  }
  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    depth.current = 0;
    setDragging(false);
    if (unavailable || native.current?.matches(":disabled")) return;
    if (event.dataTransfer.files.length !== 1) {
      setSelectionError("Choose one file at a time.");
      return;
    }
    const file = event.dataTransfer.files[0];
    if (!validateSelectedFile(file, accept, maxBytes) && native.current) {
      try {
        native.current.files = event.dataTransfer.files;
      } catch {
        /* Controlled forms still use the selected File. */
      }
    }
    void choose(file);
  }
  const message = selectionError || error,
    source = value
      ? preview?.file === value
        ? preview.url
        : null
      : existingUrl;
  const selected = Boolean(value || existingUrl || existingName),
    filename =
      value?.name ?? existingName ?? (existingUrl ? "Current image" : "");
  const Icon =
    kind === "image"
      ? PictureIcon
      : kind === "audio"
        ? MusicNoteIcon
        : UploadIcon;
  return (
    <div
      className={cn(
        "dynamic-file-input",
        unavailable && "dynamic-file-disabled",
      )}
      role="group"
      aria-busy={busy}
      aria-labelledby={`${id}-label`}
    >
      <label id={`${id}-label`} htmlFor={id} className="dynamic-file-label">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        ref={native}
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required && !value && !existingUrl && !existingName}
        disabled={unavailable}
        className="sr-only"
        tabIndex={-1}
        aria-invalid={Boolean(message)}
        aria-describedby={`${id}-hint${message ? ` ${id}-error` : ""}`}
        onInvalid={(event) => {
          event.preventDefault();
          setSelectionError("Choose a file before continuing.");
          browse.current?.focus();
        }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void choose(file);
        }}
      />
      <div
        className={cn(
          "dynamic-file-drop neo-inset",
          dragging && "dynamic-file-dragging",
          message && "dynamic-file-error",
        )}
        data-selected={selected}
        data-kind={kind}
        onDragEnter={(event) => {
          event.preventDefault();
          if (
            unavailable ||
            !Array.from(event.dataTransfer.types).includes("Files")
          )
            return;
          depth.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = unavailable ? "none" : "copy";
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          depth.current = Math.max(0, depth.current - 1);
          if (!depth.current) setDragging(false);
        }}
        onDrop={drop}
      >
        <span className="dynamic-file-art neo-raised" aria-hidden="true">
          <Icon />
          {source && (
            <Image
              src={source}
              alt=""
              fill
              sizes="96px"
              unoptimized
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
              onLoad={(event) => {
                event.currentTarget.style.removeProperty("display");
              }}
            />
          )}
          {selected && (
            <span
              className="dynamic-file-art-check"
              data-saved={(!value && selected) || progress?.phase === "success"}
            >
              <CheckIcon />
            </span>
          )}
        </span>
        <div className="dynamic-file-copy">
          <strong>
            {selected
              ? filename
              : kind === "audio"
                ? "A new sound starts here."
                : kind === "image"
                  ? "Give your sound an image."
                  : "Add the complete archive."}
          </strong>
          <p>
            {value
              ? `${formatFileSize(value.size)} · ${value.name.split(".").at(-1)?.toUpperCase() ?? "File"}`
              : selected
                ? "Saved file · choose another to replace it"
                : "Drag a file here or choose from your device"}
          </p>
          <span className="dynamic-file-limit">
            {kind === "audio"
              ? accept.toLowerCase().includes("mp3")
                ? "MP3 audio"
                : "WAV audio"
              : kind === "image"
                ? "PNG · JPEG · WebP"
                : "ZIP archive"}
            <span aria-hidden="true"> · </span>
            {formatFileSize(maxBytes)} maximum
          </span>
        </div>
        <div className="dynamic-file-actions">
          <NeumorphicButton
            ref={browse}
            size="sm"
            disabled={unavailable}
            onClick={() => native.current?.click()}
            aria-label={`${selected ? "Replace" : "Choose"} ${label}`}
          >
            <UploadIcon />
            {selected ? "Replace file" : "Choose file"}
          </NeumorphicButton>
          {value && (
            <NeumorphicButton
              size="sm"
              variant="quiet"
              disabled={unavailable}
              onClick={() => {
                void choose(null);
              }}
              aria-label={`Remove ${label}`}
            >
              <CloseIcon />
              Remove
            </NeumorphicButton>
          )}
        </div>
      </div>
      <p id={`${id}-hint`} className="dynamic-file-hint">
        {hint ?? "Choose an original file from your device."}
        {kind === "image" && (
          <span className="block">
            Automatically converted to WebP below 800 KB before upload.
          </span>
        )}
      </p>
      {message && (
        <p id={`${id}-error`} className="dynamic-file-feedback" role="alert">
          {message}
        </p>
      )}
      {preparing ? (
        <FileUploadStatus
          progress={{
            phase: "preparing",
            loaded: 0,
            total: null,
            percent: null,
          }}
        />
      ) : (
        progress && <FileUploadStatus progress={progress} onRetry={onRetry} />
      )}
    </div>
  );
}
