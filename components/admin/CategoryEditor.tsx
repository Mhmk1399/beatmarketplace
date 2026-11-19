"use client";

import { useState } from "react";
import { DynamicForm, type DynamicFormField } from "@/components/ui/dynamic/DynamicForm";
import { DynamicModal } from "@/components/ui/dynamic/DynamicModal";
import { DynamicFileInput, FileUploadStatus } from "@/components/ui/dynamic/DynamicFileInput";
import { useFileUpload } from "@/components/ui/dynamic/useFileUpload";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { ApiRequestError, errorMessage } from "@/components/studio/shared";
import type { TaxonomyItem, TaxonomyKind } from "@/lib/marketplace/types";
import { taxonomyInputSchema } from "@/lib/marketplace/validation";
import { IMAGE_SOURCE_MAX_BYTES } from "@/lib/images/policy";

type Values = { name: string; slug: string; description: string; sortOrder: string; isActive: boolean; family: string; color: string };
const baseFields: DynamicFormField<Values>[] = [
  { name: "name", label: "Category name", required: true, maxLength: 80, colSpan: 1, placeholder: "Hip Hop" },
  { name: "slug", label: "Slug", required: true, maxLength: 100, colSpan: 1, placeholder: "hip-hop", hint: "Unique lowercase English letters, numbers and hyphens." },
  { name: "description", label: "Description", type: "textarea", maxLength: 1000, rows: 3, placeholder: "Describe the sound and help listeners find the right style." },
  { name: "sortOrder", label: "Display order", type: "number", min: 0, max: 1000000, hint: "Lower numbers appear first in public category lists." },
  { name: "isActive", label: "Active and visible in the marketplace", type: "checkbox" },
];

export function CategoryEditor({ item, kind = "genres", onClose, onSaved }: { item: TaxonomyItem | null; kind?: TaxonomyKind; onClose: () => void; onSaved: () => void }) {
  const label = kind === "genres" ? "category" : kind === "moods" ? "mood" : "instrument";
  const fields: DynamicFormField<Values>[] = [...baseFields.map(field => field.name === "name" ? { ...field, label: `${label[0].toUpperCase()}${label.slice(1)} name`, placeholder: kind === "genres" ? "Hip Hop" : kind === "moods" ? "Dreamy" : "Piano" } : field),
    ...(kind === "instruments" ? [{ name: "family" as const, label: "Instrument family", type: "select" as const, required: true, options: taxonomyInputSchema.shape.family.unwrap().options.map(value => ({ value, label: value[0] + value.slice(1).toLowerCase() })) }] : []),
    ...(kind === "moods" ? [{ name: "color" as const, label: "Mood accent color", placeholder: "#9b5cf6", maxLength: 7, hint: "Optional six-digit hex color. Leave empty to use the site theme." }] : [])];
  const [values, setValues] = useState<Values>({ name: item?.name ?? "", slug: item?.slug ?? "", description: item?.description ?? "", sortOrder: String(item?.sortOrder ?? 0), isActive: item?.isActive ?? true, family: item?.family ?? "OTHER", color: item?.color ?? "" });
  const [slugEdited, setSlugEdited] = useState(Boolean(item));
  const [thumbnail, setThumbnail] = useState<File | null>(null), [banner, setBanner] = useState<File | null>(null);
  const [removeThumbnail, setRemoveThumbnail] = useState(false), [removeBanner, setRemoveBanner] = useState(false);
  const [saving, setSaving] = useState(false), [error, setError] = useState(""), [errors, setErrors] = useState<Record<string, string>>({});
  const fileUpload = useFileUpload(), toast = useToast();
  function close() { if (!saving) onClose(); }
  function clearErrors(...names: string[]) {
    setError("");
    setErrors(previous => Object.fromEntries(Object.entries(previous).filter(([name]) => !names.includes(name))));
  }
  function change<K extends keyof Values>(name: K, value: Values[K]) {
    fileUpload.reset();
    clearErrors(name, ...(name === "name" && !slugEdited ? ["slug"] : []));
    if (name === "slug") setSlugEdited(true);
    setValues(previous => ({ ...previous, [name]: value, ...(name === "name" && !slugEdited ? { slug: String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100) } : {}) }));
  }
  async function save() {
    if (saving) return;
    setError(""); setErrors({});
    const parsed = taxonomyInputSchema.safeParse({ ...values, kind, family: kind === "instruments" ? values.family : undefined, color: kind === "moods" ? values.color.trim() || null : undefined, sortOrder: values.sortOrder.trim() ? Number(values.sortOrder) : 0 });
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0]), issue.message]))); return; }
    setSaving(true);
    try {
      const form = new FormData();
      form.set("data", JSON.stringify({ ...parsed.data, ...(item ? { expectedVersion: item.version ?? 0, removeThumbnail, removeBanner } : {}) }));
      if (thumbnail) form.set("thumbnail", thumbnail);
      if (banner) form.set("banner", banner);
      await fileUpload.upload(`/api/taxonomy${item ? `/${item.id}` : ""}?kind=${kind}`, form, item ? "PATCH" : "POST");
      toast.success(item ? `${label} updated` : `${label} created`, "Your changes are available in the music catalog.");
      onSaved();
    } catch (failure) {
      setError(errorMessage(failure));
      if (failure instanceof ApiRequestError) setErrors(Object.fromEntries(failure.issues.map(issue => [issue.field, issue.message])));
    } finally { setSaving(false); }
  }
  return <DynamicModal open title={item ? `Edit ${item.name}` : `Create ${label}`} description={`Give this ${label} a clear name, description and artwork to help listeners explore its sound.`} onClose={close} closeOnBackdrop={!saving} size="lg">
    <DynamicForm fields={fields} values={values} onValueChange={change} onSubmit={event => { event.preventDefault(); void save(); }} errors={errors} formError={error} isSubmitting={saving} submitLabel={item ? `Save ${label}` : `Create ${label}`} columns={2} actions={<NeumorphicButton disabled={saving} onClick={close}>Cancel</NeumorphicButton>}>
      <div className="grid min-w-0 gap-5 sm:grid-cols-2">
        <div className="min-w-0 space-y-3">
          <DynamicFileInput label="Thumbnail" name="thumbnail" kind="image" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" maxBytes={IMAGE_SOURCE_MAX_BYTES} value={thumbnail} onChange={file => { fileUpload.reset(); clearErrors("thumbnail"); setThumbnail(file); setRemoveThumbnail(false); }} disabled={saving} existingUrl={removeThumbnail ? null : item?.thumbnailUrl} hint="Square artwork, ideally 600 × 600. PNG, JPEG or WebP up to 20 MB." error={errors.thumbnail} />
          {item?.thumbnailUrl && !thumbnail && <NeumorphicButton size="sm" disabled={saving} onClick={() => { fileUpload.reset(); setRemoveThumbnail(value => !value); }}>{removeThumbnail ? "Keep saved thumbnail" : "Remove saved thumbnail"}</NeumorphicButton>}
        </div>
        <div className="min-w-0 space-y-3">
          <DynamicFileInput label="Banner" name="banner" kind="image" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" maxBytes={IMAGE_SOURCE_MAX_BYTES} value={banner} onChange={file => { fileUpload.reset(); clearErrors("banner"); setBanner(file); setRemoveBanner(false); }} disabled={saving} existingUrl={removeBanner ? null : item?.bannerUrl} hint="Wide artwork, ideally 1920 × 720. PNG, JPEG or WebP up to 20 MB." error={errors.banner} />
          {item?.bannerUrl && !banner && <NeumorphicButton size="sm" disabled={saving} onClick={() => { fileUpload.reset(); setRemoveBanner(value => !value); }}>{removeBanner ? "Keep saved banner" : "Remove saved banner"}</NeumorphicButton>}
        </div>
      </div>
      <FileUploadStatus progress={fileUpload.progress} label={`Uploading ${label} artwork`} processingLabel={`Optimizing images and saving your ${label}…`} />
    </DynamicForm>
  </DynamicModal>;
}
