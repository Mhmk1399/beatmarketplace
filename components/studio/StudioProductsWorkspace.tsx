"use client";
import { useCallback, useState, type FormEvent } from "react";
import {
  ResourceManager,
  type ResourceConfig,
} from "@/components/admin/ResourceManager";
import { DynamicModal } from "@/components/ui/dynamic/DynamicModal";
import { DynamicSelect } from "@/components/ui/dynamic/DynamicSelect";
import {
  DynamicFileInput,
  FileUploadStatus,
} from "@/components/ui/dynamic/DynamicFileInput";
import { useFileUpload } from "@/components/ui/dynamic/useFileUpload";
import { formatFileSize } from "@/lib/uploads/files";
import {
  NeumorphicButton,
  NeumorphicLink,
} from "@/components/ui/neumorphic/Button";
import { OwnedBeatPicker } from "@/components/studio/OwnedBeatPicker";
import {
  apiRequest,
  controlClass,
  errorMessage,
  Field,
  RequestError,
} from "@/components/studio/shared";

type Kind = "tracklists" | "sound-kits" | "services" | "videos";
type Product = {
  id: string;
  title: string;
  description: string;
  status: "DRAFT" | "PUBLISHED";
  trackIds: string[];
  videoUrl: string;
  videoProvider: string;
  priceToman: number | null;
  assetName: string;
  assetMimeType: string;
  assetSizeBytes: number | null;
  hasAsset: boolean;
  assetVersion: number;
  version: number;
  createdAt: string;
};
const meta = {
  tracklists: {
    title: "Tracklists",
    description:
      "Arrange your own beats into preview-only listening lists and publish a shareable page.",
    create: "Create tracklist",
  },
  "sound-kits": {
    title: "Sound Kits",
    description:
      "Upload encrypted ZIP products, set a price, and publish them for secure checkout and delivery.",
    create: "Create sound kit",
  },
  services: {
    title: "Services",
    description:
      "Publish clearly scoped producer services with a listed price and a real inquiry path.",
    create: "Create service",
  },
  videos: {
    title: "Videos",
    description:
      "Publish validated YouTube or Vimeo links without accepting arbitrary embed code.",
    create: "Add video",
  },
} as const;
function Editor({
  kind,
  item,
  onClose,
  onSaved,
}: {
  kind: Kind;
  item: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [currentItem, setCurrentItem] = useState(item);
  const [values, setValues] = useState({
    title: item?.title ?? "",
    description: item?.description ?? "",
    status: item?.status ?? "DRAFT",
    videoUrl: item?.videoUrl ?? "",
    priceToman: item?.priceToman ? String(item.priceToman) : "",
  });
  const [trackIds, setTrackIds] = useState(item?.trackIds ?? []),
    [kitFile, setKitFile] = useState<File | null>(null),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const fileUpload = useFileUpload();
  const close = useCallback(() => {
    if (!saving) onClose();
  }, [saving, onClose]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const saved = await apiRequest<{ item: Product }>(
        currentItem
          ? `/api/studio-products/${kind}/${currentItem.id}`
          : `/api/studio-products/${kind}`,
        {
          method: currentItem ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            trackIds,
            expectedVersion: currentItem?.version,
            priceToman: values.priceToman ? Number(values.priceToman) : null,
            assetName:
              kind === "sound-kits" ? (currentItem?.assetName ?? "") : "",
            assetMimeType:
              kind === "sound-kits" ? (currentItem?.assetMimeType ?? "") : "",
            assetSizeBytes:
              kind === "sound-kits"
                ? (currentItem?.assetSizeBytes ?? null)
                : null,
          }),
        },
      );
      setCurrentItem(saved.item);
      if (kind === "sound-kits" && kitFile) {
        await fileUpload.upload(
          `/api/studio-products/sound-kits/${saved.item.id}/asset`,
          kitFile,
          "POST",
          { "Content-Type": kitFile.type || "application/zip", "X-File-Name": encodeURIComponent(kitFile.name) },
        );
      }
      onSaved();
    } catch (value) {
      setError(errorMessage(value));
    } finally {
      setSaving(false);
    }
  }
  return (
    <DynamicModal
      open
      title={item ? `Edit ${item.title}` : meta[kind].create}
      onClose={close}
      closeOnBackdrop={!saving}
      size="lg"
    >
      <form onSubmit={submit} className="space-y-5">
        <fieldset disabled={saving} className="space-y-5">
          <Field label="Title *">
            {(id) => (
              <input
                id={id}
                required
                maxLength={160}
                className={controlClass}
                value={values.title}
                onChange={(e) =>
                  setValues({ ...values, title: e.target.value })
                }
              />
            )}
          </Field>
          <Field label="Description">
            {(id) => (
              <textarea
                id={id}
                rows={4}
                maxLength={8000}
                className={controlClass}
                value={values.description}
                onChange={(e) =>
                  setValues({ ...values, description: e.target.value })
                }
              />
            )}
          </Field>
          {kind === "tracklists" && (
            <>
              <OwnedBeatPicker selected={trackIds} onChange={setTrackIds} />
              <p className="text-xs text-muted">
                Beats play in the order selected. Remove and re-add a beat to
                move it to the end.
              </p>
            </>
          )}
          {kind === "videos" && (
            <Field label="YouTube or Vimeo URL *">
              {(id) => (
                <input
                  id={id}
                  required
                  type="url"
                  maxLength={2048}
                  className={controlClass}
                  value={values.videoUrl}
                  onChange={(e) =>
                    setValues({ ...values, videoUrl: e.target.value })
                  }
                />
              )}
            </Field>
          )}
          {kind === "services" && (
            <Field label="Starting price (Toman) *">
              {(id) => (
                <input
                  id={id}
                  required
                  type="number"
                  min={1000}
                  max={1000000000}
                  className={controlClass}
                  value={values.priceToman}
                  onChange={(e) =>
                    setValues({ ...values, priceToman: e.target.value })
                  }
                />
              )}
            </Field>
          )}
          {kind === "sound-kits" && (
            <>
              <Field label="Price (Toman) *">
                {(id) => (
                  <input
                    id={id}
                    required
                    type="number"
                    min={1000}
                    max={1000000000}
                    className={controlClass}
                    value={values.priceToman}
                    onChange={(e) =>
                      setValues({ ...values, priceToman: e.target.value })
                    }
                  />
                )}
              </Field>
              <DynamicFileInput
                label={
                  currentItem?.hasAsset
                    ? "Replace ZIP archive"
                    : "ZIP archive *"
                }
                name="kit"
                kind="file"
                accept="application/zip,application/x-zip-compressed,.zip"
                maxBytes={40 * 1024 * 1024}
                value={kitFile}
                onChange={(file) => {
                  fileUpload.reset();
                  setKitFile(file);
                  if (file && currentItem?.status === "PUBLISHED")
                    setValues((current) => ({ ...current, status: "DRAFT" }));
                }}
                required={!currentItem?.hasAsset}
                existingName={
                  currentItem?.hasAsset
                    ? `${currentItem.assetName} · ${formatFileSize(currentItem.assetSizeBytes ?? 0)}`
                    : undefined
                }
                progress={fileUpload.progress}
                hint="ZIP only, up to 40 MB. Replacing a published archive returns the listing to Draft so you can verify the new version before republishing."
              />
              <FileUploadStatus
                progress={fileUpload.progress}
                label="Uploading encrypted sound kit"
                processingLabel="Encrypting and securing your archive…"
              />
              {!item && (
                <p className="text-xs leading-6 text-muted">
                  The first save creates a private draft and uploads the
                  archive. Open it again to publish after confirming the saved
                  file.
                </p>
              )}
            </>
          )}
          {(kind !== "sound-kits" || currentItem) && (
            <Field label="Publish state">
              {(id) => (
                <DynamicSelect
                  id={id}
                  value={values.status}
                  onChange={(e) =>
                    setValues({
                      ...values,
                      status: e.target.value as "DRAFT" | "PUBLISHED",
                    })
                  }
                  options={[
                    { value: "DRAFT", label: "Draft" },
                    ...(kind !== "sound-kits" || currentItem?.hasAsset
                      ? [{ value: "PUBLISHED", label: "Published" }]
                      : []),
                  ]}
                />
              )}
            </Field>
          )}
        </fieldset>
        {error && <RequestError message={error} />}
        <div className="flex justify-end gap-3">
          <NeumorphicButton onClick={close}>Cancel</NeumorphicButton>
          <NeumorphicButton type="submit" variant="accent" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </NeumorphicButton>
        </div>
      </form>
    </DynamicModal>
  );
}
export function StudioProductsWorkspace({ kind }: { kind: Kind }) {
  const config: ResourceConfig<Product> = {
    title: meta[kind].title,
    description: meta[kind].description,
    endpoint: `/api/studio-products/${kind}`,
    label: (item) => item.title,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    createLabel: meta[kind].create,
    emptyTitle: `No ${meta[kind].title.toLowerCase()} yet`,
    emptyDescription:
      kind === "tracklists"
        ? "Create a listening sequence from your owned beats."
        : kind === "videos"
          ? "Add a YouTube or Vimeo video to your studio."
          : kind === "services"
            ? "Describe a service buyers can inquire about."
            : "Upload a ZIP archive, set its price, then publish it for sale.",
    deleteDescription:
      "This removes the item from your studio and any public listing.",
    columns: [
      {
        id: "title",
        header:
          kind === "tracklists"
            ? "Tracklist"
            : kind === "sound-kits"
              ? "Sound kit"
              : kind === "services"
                ? "Service"
                : "Video",
        accessor: "title",
      },
      {
        id: "status",
        header: "State",
        cell: (item) => <span className="workspace-status">{item.status}</span>,
      },
      {
        id: "scope",
        header: "Details",
        cell: (item) =>
          kind === "tracklists"
            ? `${item.trackIds.length} beats`
            : kind === "videos"
              ? item.videoProvider
              : kind === "services"
                ? `${(item.priceToman ?? 0).toLocaleString("en-US")} Toman`
                : item.hasAsset
                  ? `${item.assetName} · v${item.assetVersion}`
                  : "Archive required",
      },
    ],
    editor: (props) => <Editor kind={kind} {...props} />,
    details: (item) => (
      <div className="space-y-4">
        <p className="whitespace-pre-wrap text-sm text-muted">
          {item.description || "No description."}
        </p>
        {kind === "tracklists" && (
          <>
            <p className="text-sm">{item.trackIds.length} preview-only beats</p>
            {item.status === "PUBLISHED" && (
              <NeumorphicLink href={`/tracklists/${item.id}`}>
                Open shared tracklist
              </NeumorphicLink>
            )}
          </>
        )}
        {kind === "videos" && (
          <>
            {item.status === "PUBLISHED" && (
              <NeumorphicLink href={`/videos/${item.id}`}>
                Open public video page
              </NeumorphicLink>
            )}
            <a
              href={item.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block min-h-11 pt-3 font-semibold text-accent-text underline"
            >
              Open source on{" "}
              {item.videoProvider === "VIMEO" ? "Vimeo" : "YouTube"}
            </a>
          </>
        )}
        {kind === "services" && (
          <>
            <p className="font-bold">
              {(item.priceToman ?? 0).toLocaleString("en-US")} Toman
            </p>
            {item.status === "PUBLISHED" && (
              <NeumorphicLink href={`/services/${item.id}`}>
                Open public inquiry page
              </NeumorphicLink>
            )}
          </>
        )}
        {kind === "sound-kits" && (
          <>
            <p className="text-sm">
              {item.hasAsset
                ? `${item.assetName} · ${formatFileSize(item.assetSizeBytes ?? 0)} · Asset v${item.assetVersion}`
                : "No archive uploaded yet."}
            </p>
            <p className="text-sm font-bold">
              {(item.priceToman ?? 0).toLocaleString("en-US")} Toman
            </p>
            {item.status === "PUBLISHED" && (
              <NeumorphicLink href={`/sound-kits/${item.id}`}>
                Open public sound kit
              </NeumorphicLink>
            )}
          </>
        )}
      </div>
    ),
  };
  return <ResourceManager config={config} />;
}
