"use client";
import { useCallback, useState, type FormEvent, type ReactNode } from "react";
import { DynamicModal } from "@/components/ui/dynamic/DynamicModal";
import { DynamicSelect } from "@/components/ui/dynamic/DynamicSelect";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";
import {
  ResourceManager,
  type ResourceConfig,
} from "@/components/admin/ResourceManager";
import { OwnedBeatPicker } from "./OwnedBeatPicker";
import {
  apiRequest,
  controlClass,
  errorMessage,
  Field,
  RequestError,
} from "./shared";
import { licenseConditions } from "@/lib/licensing/conditions";
import { LicenseConditions } from "@/components/licensing/LicenseConditions";
import type { StudioLicense } from "@/lib/marketplace/types";
function EditorSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const headingId = `license-section-${title.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <section className="workspace-editor-section" aria-labelledby={headingId}>
      <header>
        <h3 id={headingId}>{title}</h3>
        <span>{description}</span>
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  );
}
function ContractEditor({
  contract,
  onClose,
  onSaved,
}: {
  contract: StudioLicense | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState({
    title: contract?.title ?? "Beat License",
    price: contract?.price ?? "250000",
    licenseType: contract?.licenseType ?? "NON_EXCLUSIVE",
    streamingLimit:
      contract?.streamingLimit === null || !contract
        ? ""
        : String(contract.streamingLimit),
    distributionLimit:
      contract?.distributionLimit === null || !contract
        ? ""
        : String(contract.distributionLimit),
    customTerms: contract?.customTerms ?? "",
  });
  const initial = contract?.conditions ?? licenseConditions(contract ?? {});
  const [rights, setRights] = useState({
    ...initial,
    termMonths: initial.termMonths === null ? "" : String(initial.termMonths),
    musicVideoLimit:
      initial.musicVideoLimit === null ? "" : String(initial.musicVideoLimit),
    royaltyPercent:
      initial.royaltyPercent === null ? "" : String(initial.royaltyPercent),
    publishingSharePercent:
      initial.publishingSharePercent === null
        ? ""
        : String(initial.publishingSharePercent),
    description: contract?.description ?? "",
    includedCountries: initial.territory.includedCountries.join(", "),
    excludedCountries: initial.territory.excludedCountries.join(", "),
  });
  const [trackIds, setTrackIds] = useState(contract?.trackIds ?? []);
  const [formats, setFormats] = useState<("MP3" | "WAV" | "STEMS")[]>(
    contract?.formats?.filter((format): format is "MP3" | "WAV" | "STEMS" =>
      ["MP3", "WAV", "STEMS"].includes(format),
    ) ?? ["WAV"],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const close = useCallback(() => {
    if (!saving) onClose();
  }, [saving, onClose]);

  function update(name: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (trackIds.length === 0) {
      setError("Select at least one track for this license.");
      return;
    }
    if (formats.length === 0) {
      setError("Choose at least one delivery format.");
      return;
    }
    setSaving(true);
    try {
      await apiRequest(
        contract ? `/api/contracts/${contract.id}` : "/api/contracts",
        {
          method: contract ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            ...rights,
            description: rights.description,
            expectedVersion: contract?.version,
            musicVideoLimit:
              rights.musicVideoLimit === ""
                ? null
                : Number(rights.musicVideoLimit),
            termMonths:
              rights.termMonths === "" ? null : Number(rights.termMonths),
            royaltyPercent:
              rights.royaltyPercent === ""
                ? null
                : Number(rights.royaltyPercent),
            publishingSharePercent:
              rights.publishingSharePercent === ""
                ? null
                : Number(rights.publishingSharePercent),
            territory: {
              worldwide: rights.territory.worldwide,
              includedCountries: rights.includedCountries
                .split(",")
                .map((v) => v.trim().toUpperCase())
                .filter(Boolean),
              excludedCountries: rights.excludedCountries
                .split(",")
                .map((v) => v.trim().toUpperCase())
                .filter(Boolean),
            },
            includedCountries: undefined,
            excludedCountries: undefined,
            currency: "IRT",
            trackIds,
            formats,
            streamingLimit:
              values.streamingLimit === ""
                ? null
                : Number(values.streamingLimit),
            distributionLimit:
              values.distributionLimit === ""
                ? null
                : Number(values.distributionLimit),
          }),
        },
      );
      toast.success(
        "License saved",
        "Buyers will see the updated terms and price.",
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
      title={contract ? "Edit license" : "Create a license"}
      description="Set the price, delivery formats, and usage limits buyers see before purchase. Full files unlock only after verified payment."
      size="lg"
    >
      <form onSubmit={submit} className="space-y-6" aria-busy={saving}>
        <fieldset disabled={saving} className="space-y-5">
          <legend className="sr-only">License details</legend>
          <EditorSection
            title="Basic"
            description="Name, price and the license model buyers choose at checkout."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="License name *">
                {(id) => (
                  <input
                    id={id}
                    required
                    maxLength={160}
                    value={values.title}
                    onChange={(event) => update("title", event.target.value)}
                    className={controlClass}
                  />
                )}
              </Field>
              <Field
                label="Price (Toman) *"
                hint="Whole Toman, from 1,000 to 1,000,000,000."
              >
                {(id) => (
                  <input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={1000}
                    max={1000000000}
                    step={1}
                    required
                    value={values.price}
                    onChange={(event) => update("price", event.target.value)}
                    className={controlClass}
                  />
                )}
              </Field>
            </div>
            <Field label="License type">
              {(id) => (
                <DynamicSelect
                  id={id}
                  value={values.licenseType}
                  onChange={(event) =>
                    update("licenseType", event.target.value)
                  }
                  className={controlClass}
                >
                  <option value="NON_EXCLUSIVE">Non-exclusive</option>
                  <option value="EXCLUSIVE">Exclusive</option>
                </DynamicSelect>
              )}
            </Field>
            {values.licenseType === "EXCLUSIVE" && (
              <p className="text-xs leading-5 text-[var(--warning-text)]">
                You can prepare exclusive license terms here. Exclusive
                purchases require a direct agreement with the producer; online
                checkout for exclusive licenses is coming later.
              </p>
            )}
            <Field label="License description">
              {(id) => (
                <textarea
                  id={id}
                  rows={3}
                  maxLength={8000}
                  className={controlClass}
                  value={rights.description}
                  onChange={(e) =>
                    setRights({ ...rights, description: e.target.value })
                  }
                />
              )}
            </Field>
          </EditorSection>
          <EditorSection
            title="Usage Rights"
            description="Set what the buyer may do with music made using your beat."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["commercialUse", "Commercial use"],
                  ["creditRequired", "Producer credit required"],
                  ["livePerformance", "Live performances allowed"],
                  ["broadcastRights", "Broadcast / radio allowed"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex min-h-11 items-center gap-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={rights[key]}
                    onChange={(e) =>
                      setRights({ ...rights, [key]: e.target.checked })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
            <Field
              label="Required producer credit"
              hint="Example: Produced by your producer name."
            >
              {(id) => (
                <input
                  id={id}
                  maxLength={500}
                  className={controlClass}
                  value={rights.creditText}
                  onChange={(e) =>
                    setRights({ ...rights, creditText: e.target.value })
                  }
                />
              )}
            </Field>
            <Field label="Content ID registration">
              {(id) => (
                <DynamicSelect
                  id={id}
                  className={controlClass}
                  value={
                    rights.contentIdAllowed === null
                      ? "unspecified"
                      : String(rights.contentIdAllowed)
                  }
                  onChange={(e) =>
                    setRights({
                      ...rights,
                      contentIdAllowed:
                        e.target.value === "unspecified"
                          ? null
                          : e.target.value === "true",
                    })
                  }
                >
                  <option value="unspecified">Not specified</option>
                  <option value="false">Not allowed</option>
                  <option value="true">Allowed</option>
                </DynamicSelect>
              )}
            </Field>
          </EditorSection>
          <EditorSection
            title="Territory"
            description="Choose where this license applies and which law governs it."
          >
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={rights.territory.worldwide}
                onChange={(e) =>
                  setRights({
                    ...rights,
                    territory: {
                      ...rights.territory,
                      worldwide: e.target.checked,
                    },
                  })
                }
              />
              Worldwide territory
            </label>
            {!rights.territory.worldwide && (
              <Field
                label="Permitted countries"
                hint="Comma-separated two-letter country codes, for example IR, GB."
              >
                {(id) => (
                  <input
                    id={id}
                    required
                    maxLength={1000}
                    className={controlClass}
                    value={rights.includedCountries}
                    onChange={(e) =>
                      setRights({
                        ...rights,
                        includedCountries: e.target.value,
                      })
                    }
                  />
                )}
              </Field>
            )}
            <Field
              label="Excluded countries"
              hint="Comma-separated two-letter country codes; leave empty for none."
            >
              {(id) => (
                <input
                  id={id}
                  maxLength={1000}
                  className={controlClass}
                  value={rights.excludedCountries}
                  onChange={(e) =>
                    setRights({ ...rights, excludedCountries: e.target.value })
                  }
                />
              )}
            </Field>
            <Field label="Governing law / jurisdiction">
              {(id) => (
                <input
                  id={id}
                  maxLength={500}
                  className={controlClass}
                  value={rights.governingLaw}
                  onChange={(e) =>
                    setRights({ ...rights, governingLaw: e.target.value })
                  }
                />
              )}
            </Field>
          </EditorSection>
          <EditorSection
            title="Limits"
            description="Leave a limit empty when usage should be unlimited or not specified."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              {(
                [
                  [
                    "musicVideoLimit",
                    "Music video limit",
                    "Empty means unlimited; zero means none.",
                    0,
                    1000000000,
                  ],
                  [
                    "termMonths",
                    "License duration (months)",
                    "Empty means no fixed expiry. Starts after verified payment.",
                    1,
                    1200,
                  ],
                  [
                    "royaltyPercent",
                    "Producer share of new master net receipts (%)",
                    "Empty means not specified; zero means no share.",
                    0,
                    100,
                  ],
                  [
                    "publishingSharePercent",
                    "Producer share of new composition publishing (%)",
                    "Empty means not specified. Separate from master receipts.",
                    0,
                    100,
                  ],
                ] as const
              ).map(([key, label, hint, min, max]) => (
                <Field key={key} label={label} hint={hint}>
                  {(id) => (
                    <input
                      id={id}
                      type="number"
                      min={min}
                      max={max}
                      step={key.endsWith("Percent") ? "0.01" : "1"}
                      className={controlClass}
                      value={rights[key]}
                      onChange={(e) =>
                        setRights({ ...rights, [key]: e.target.value })
                      }
                    />
                  )}
                </Field>
              ))}
            </div>
            <p className="text-xs leading-6 text-muted">
              Royalty and publishing percentages are recorded in the agreement.
              Collection and payouts are arranged separately.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Streaming limit"
                hint="Leave empty for unlimited streams."
              >
                {(id) => (
                  <input
                    id={id}
                    type="number"
                    min={0}
                    max={1000000000}
                    step={1}
                    value={values.streamingLimit}
                    onChange={(event) =>
                      update("streamingLimit", event.target.value)
                    }
                    placeholder="Unlimited"
                    className={controlClass}
                  />
                )}
              </Field>
              <Field
                label="Distribution limit"
                hint="Leave empty for unlimited copies."
              >
                {(id) => (
                  <input
                    id={id}
                    type="number"
                    min={0}
                    max={1000000000}
                    step={1}
                    value={values.distributionLimit}
                    onChange={(event) =>
                      update("distributionLimit", event.target.value)
                    }
                    placeholder="Unlimited"
                    className={controlClass}
                  />
                )}
              </Field>
            </div>
            <Field
              label="Additional terms"
              hint="Describe credit requirements and any other usage conditions clearly."
            >
              {(id) => (
                <textarea
                  id={id}
                  rows={5}
                  maxLength={20000}
                  value={values.customTerms}
                  onChange={(event) =>
                    update("customTerms", event.target.value)
                  }
                  className={`${controlClass} resize-y`}
                />
              )}
            </Field>
            <div>
              <p className="mb-2 text-sm font-semibold">
                Files delivered after payment
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {(["MP3", "WAV", "STEMS"] as const).map((format) => (
                  <label
                    key={format}
                    className="flex min-h-11 items-center gap-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={formats.includes(format)}
                      onChange={(event) =>
                        setFormats((current) =>
                          event.target.checked
                            ? [...current, format]
                            : current.filter((value) => value !== format),
                        )
                      }
                    />
                    {format === "STEMS" ? "ZIP stems" : format}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">
                Every selected track must have each promised file ready before
                this license can be saved or offered.
              </p>
            </div>
          </EditorSection>
          <EditorSection
            title="Tracks"
            description="Apply this license to one or more beats you own."
          >
            <OwnedBeatPicker selected={trackIds} onChange={setTrackIds} />
          </EditorSection>
          <EditorSection
            title="Buyer Agreement Preview"
            description="This is the human-readable summary buyers review at checkout and receive after purchase."
          >
            <LicenseConditions
              license={{
                id: contract?.id ?? "preview",
                title: values.title || "Untitled license",
                description: rights.description,
                price: values.price || "0",
                currency: "IRT",
                licenseType: values.licenseType as
                  "NON_EXCLUSIVE" | "EXCLUSIVE",
                formats,
                streamingLimit:
                  values.streamingLimit === ""
                    ? null
                    : Number(values.streamingLimit),
                distributionLimit:
                  values.distributionLimit === ""
                    ? null
                    : Number(values.distributionLimit),
                customTerms: values.customTerms,
                version: contract?.version ?? 1,
                conditions: licenseConditions(
                  {
                    ...rights,
                    streamingLimit:
                      values.streamingLimit === ""
                        ? null
                        : Number(values.streamingLimit),
                    distributionLimit:
                      values.distributionLimit === ""
                        ? null
                        : Number(values.distributionLimit),
                    musicVideoLimit:
                      rights.musicVideoLimit === ""
                        ? null
                        : Number(rights.musicVideoLimit),
                    termMonths:
                      rights.termMonths === ""
                        ? null
                        : Number(rights.termMonths),
                    royaltyPercent:
                      rights.royaltyPercent === ""
                        ? null
                        : Number(rights.royaltyPercent),
                    publishingSharePercent:
                      rights.publishingSharePercent === ""
                        ? null
                        : Number(rights.publishingSharePercent),
                  },
                  {
                    worldwide: rights.territory.worldwide,
                    includedCountries: rights.includedCountries
                      .split(",")
                      .map((value) => value.trim().toUpperCase())
                      .filter(Boolean),
                    excludedCountries: rights.excludedCountries
                      .split(",")
                      .map((value) => value.trim().toUpperCase())
                      .filter(Boolean),
                  },
                ),
              }}
            />
          </EditorSection>
        </fieldset>
        {error && <RequestError message={error} />}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <NeumorphicButton disabled={saving} onClick={close}>
            Cancel
          </NeumorphicButton>
          <NeumorphicButton type="submit" variant="accent" disabled={saving}>
            {saving ? "Saving…" : "Save license"}
          </NeumorphicButton>
        </div>
      </form>
    </DynamicModal>
  );
}

export function ContractsWorkspace() {
  const config: ResourceConfig<StudioLicense> = {
    title: "Licenses",
    description:
      "Set clear usage terms and prices for your catalog. Existing purchases keep the terms they were sold with.",
    endpoint: "/api/contracts",
    query: "mine=1",
    label: (item) => item.title,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    createLabel: "Create license",
    deleteLabel: "Disable",
    deleteDescription:
      "New buyers will no longer be offered this license. Previously purchased licenses remain valid.",
    columns: [
      { id: "title", header: "License", accessor: "title" },
      {
        id: "price",
        header: "Price",
        cell: (item) => `${Number(item.price).toLocaleString("en-US")} Toman`,
      },
      {
        id: "type",
        header: "Type",
        cell: (item) =>
          ({
            NON_EXCLUSIVE: "Non-exclusive",
            EXCLUSIVE: "Exclusive",
            CUSTOM: "Custom",
          })[item.licenseType],
      },
      { id: "tracks", header: "Beats", cell: (item) => item.trackIds.length },
      {
        id: "status",
        header: "Status",
        cell: (item) => (item.isActive ? "Active" : "Inactive"),
      },
    ],
    editor: ({ item, onClose, onSaved }) => (
      <ContractEditor contract={item} onClose={onClose} onSaved={onSaved} />
    ),
    details: (item) => (
      <div className="space-y-4">
        <p className="text-sm">
          {Number(item.price).toLocaleString("en-US")} Toman
        </p>
        <p className="text-sm text-muted">
          {item.licenseType} | Version {item.version} | {item.trackIds.length}{" "}
          beats
        </p>
        <LicenseConditions license={item} />
      </div>
    ),
  };
  return <ResourceManager config={config} />;
}
