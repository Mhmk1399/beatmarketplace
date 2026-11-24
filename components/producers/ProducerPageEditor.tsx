"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { DynamicForm, type DynamicFormField } from "@/components/ui/dynamic/DynamicForm";
import { DynamicFileInput, FileUploadStatus } from "@/components/ui/dynamic/DynamicFileInput";
import { DynamicMultiSelect } from "@/components/ui/dynamic/DynamicMultiSelect";
import { DynamicSelect } from "@/components/ui/dynamic/DynamicSelect";
import { useFileUpload } from "@/components/ui/dynamic/useFileUpload";
import { FrequencyLoader } from "@/components/ui/dynamic/GlobalLoading";
import { NeumorphicSurface } from "@/components/ui/neumorphic/Surface";
import { NeumorphicButton, NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { apiRequest, ApiRequestError, controlClass, errorMessage, Field, RequestError } from "@/components/studio/shared";
import { IMAGE_SOURCE_MAX_BYTES } from "@/lib/images/policy";
import { PRODUCER_SOCIALS, type ProducerSettings, type ProducerSummary, type ProducerSocial, type BannerPosition, type ProducerLayout } from "@/lib/producers/types";
import { producerPageSettingsSchema } from "@/lib/producers/validation";
import type { WorkspaceUser } from "@/lib/workspace/types";
import { ProducerHero } from "./ProducerIdentity";
import { FeaturedBeatPicker } from "./FeaturedBeatPicker";
import styles from "./producers.module.css";

type Values = Record<string, string>;
const fields: DynamicFormField<Values>[] = [
  { name: "stageName", label: "Producer name", required: true, maxLength: 120, colSpan: 1 },
  { name: "storefrontName", label: "Studio name", required: true, maxLength: 120, colSpan: 1 },
  { name: "tagline", label: "Your sound in one line", maxLength: 160, placeholder: "Late-night melodies. Beats with a story." },
  { name: "bio", label: "Your studio story", type: "textarea", maxLength: 1000, rows: 5 },
  { name: "location", label: "Public studio location", maxLength: 120, colSpan: 1, placeholder: "Tehran, Iran" },
  { name: "website", label: "Studio website", type: "url", maxLength: 2048, colSpan: 1, placeholder: "https://…" },
];
const formValues = (profile: ProducerSettings): Values => Object.fromEntries(fields.map(field => [field.name, String(profile[field.name as keyof ProducerSettings] || "")]));
const fieldName = (name: string) => name.startsWith("socialLinks.") ? `social_${name.split(".")[1]}` : name.split(".")[0];
const publicProducerKey = (key: unknown) => typeof key === "string" && key.startsWith("/api/producers/");
type ProducerPageEditorProps = {
  avatarRevision?: number;
  endpoint?: string;
  featuredBeatsEndpoint?: string;
  featuredBeatLookupEndpoint?: string;
  admin?: boolean;
  disabled?: boolean;
  onAccountLoaded?: (user: WorkspaceUser) => void;
  onBusyChange?: (busy: boolean) => void;
  mediaOnly?: boolean;
};
export function ProducerPageEditor({ avatarRevision = 0, endpoint = "/api/account/producer", featuredBeatsEndpoint, featuredBeatLookupEndpoint, admin = false, disabled = false, onAccountLoaded, onBusyChange, mediaOnly = false }: ProducerPageEditorProps) {
  const [profile, setProfile] = useState<ProducerSettings | null>(null), [values, setValues] = useState<Values>({});
  const [socials, setSocials] = useState<Record<ProducerSocial, string>>(Object.fromEntries(PRODUCER_SOCIALS.map(name => [name, ""])) as Record<ProducerSocial, string>);
  const [genres, setGenres] = useState<{ id: string; name: string }[]>([]), [genreIds, setGenreIds] = useState<string[]>([]), [featuredIds, setFeaturedIds] = useState<string[]>([]);
  const [genreError, setGenreError] = useState(""), [genreReload, setGenreReload] = useState(0);
  const [layout, setLayout] = useState<ProducerLayout>("IMMERSIVE"), [position, setPosition] = useState<BannerPosition>("center");
  const [banner, setBanner] = useState<File | null>(null), [removeBanner, setRemoveBanner] = useState(false), [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(""), [errors, setErrors] = useState<Record<string, string>>({}), [reload, setReload] = useState(0);
  const ready = useRef(false), fileUpload = useFileUpload(), toast = useToast(), router = useRouter();
  const { mutate } = useSWRConfig();
  function loaded(data: ProducerSettings) {
    setProfile(data); setValues(formValues(data)); setSocials(data.socialLinks); setGenreIds(data.genreIds); setFeaturedIds(data.featuredTrackIds); setLayout(data.layout); setPosition(data.bannerPosition); ready.current = true;
  }
  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<{ profile: ProducerSettings; user?: WorkspaceUser }>(endpoint, { signal: controller.signal, quiet: true }).then(data => {
      if (controller.signal.aborted) return;
      if (ready.current) setProfile(current => current ? { ...current, avatarUrl: data.profile.avatarUrl, publicUrl: data.profile.publicUrl } : data.profile);
      else loaded(data.profile);
      if (data.user) onAccountLoaded?.(data.user);
      if (avatarRevision) void mutate(publicProducerKey, undefined, { revalidate: false });
      setError("");
    }).catch(error => { if (!controller.signal.aborted) setError(errorMessage(error)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint, reload, avatarRevision, mutate, onAccountLoaded]);
  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<{ items: { id: string; name: string }[] }>("/api/taxonomy?kind=genres", { quiet: true, signal: controller.signal }).then(data => { if (!controller.signal.aborted) { setGenres(data.items); setGenreError(""); } }).catch(error => { if (!controller.signal.aborted) setGenreError(errorMessage(error)); });
    return () => controller.abort();
  }, [genreReload]);
  useEffect(() => {
    let active = true; const url = banner ? URL.createObjectURL(banner) : null;
    void Promise.resolve().then(() => { if (active) setPreview(banner && url ? { file: banner, url } : null); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [banner]);
  function change() { setError(""); setErrors({}); fileUpload.reset(); }
  async function save() {
    if (!profile || saving || disabled) return;
    const payload = { ...values, genreIds, featuredTrackIds: featuredIds, layout, bannerPosition: position, socialLinks: socials, removeBanner, expectedVersion: profile.version };
    const parsed = producerPageSettingsSchema.safeParse(payload);
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map(issue => [fieldName(issue.path.join(".")), issue.message]))); setError("Please review the highlighted fields."); return; }
    setSaving(true); onBusyChange?.(true); setError(""); setErrors({});
    try {
      let result: { profile: ProducerSettings };
      if (banner) { const body = new FormData(); body.set("data", JSON.stringify(parsed.data)); body.set("banner", banner); result = await fileUpload.upload(endpoint, body, "PATCH"); }
      else result = await apiRequest(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      loaded(result.profile); setBanner(null); setRemoveBanner(false); await mutate(publicProducerKey, undefined, { revalidate: false }); toast.success("Studio page updated", "The public profile now reflects these changes."); if (!admin) router.refresh();
    } catch (error) { setError(errorMessage(error)); if (error instanceof ApiRequestError) setErrors(Object.fromEntries(error.issues.map(issue => [fieldName(issue.field), issue.message]))); }
    finally { setSaving(false); onBusyChange?.(false); }
  }
  if (loading) return <FrequencyLoader overlay={false} label="Opening your studio designer…" />;
  if (!profile) return <RequestError message={error || "Your studio page could not be loaded."} retry={() => { setLoading(true); setReload(value => value + 1); }} />;
  const draft: ProducerSummary = { id: profile.producerId, href: profile.publicUrl, username: "", stageName: values.stageName || "Your producer name", storefrontName: values.storefrontName || "Your studio", tagline: values.tagline || "", bio: values.bio || "", location: values.location || "", website: values.website || "", socialLinks: socials, avatarUrl: profile.avatarUrl, bannerUrl: removeBanner ? null : banner && preview?.file === banner ? preview.url : profile.bannerUrl, layout, bannerPosition: position, genres: [], beatCount: 0, memberSince: new Date(0).toISOString() };
  if (mediaOnly) return <NeumorphicSurface className="rounded-[var(--radius-card)] p-5 sm:p-7"><div className={styles.editorHeader}><div><h2>Studio banner</h2><p>Update the wide image shown on your public producer page.</p></div><NeumorphicLink href={profile.publicUrl}>View public page ↗</NeumorphicLink></div><div className={styles.preview}><ProducerHero producer={draft} preview /></div><form className="mt-6 space-y-5" onSubmit={event => { event.preventDefault(); void save(); }}><fieldset disabled={saving || disabled} className="space-y-5"><DynamicFileInput label="Studio banner" name="banner" kind="image" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" maxBytes={IMAGE_SOURCE_MAX_BYTES} value={banner} onChange={file => { change(); setBanner(file); setRemoveBanner(false); }} existingUrl={removeBanner ? null : profile.bannerUrl} hint="Wide artwork works best, ideally 1920 × 720." />{profile.bannerUrl && !banner && <NeumorphicButton onClick={() => { change(); setRemoveBanner(value => !value); }}>{removeBanner ? "Keep saved banner" : "Remove saved banner"}</NeumorphicButton>}<Field label="Banner focal point">{id => <DynamicSelect id={id} value={position} onChange={event => { change(); setPosition(event.target.value as BannerPosition); }} options={[{ value: "top", label: "Top" }, { value: "center", label: "Center" }, { value: "bottom", label: "Bottom" }]} />}</Field></fieldset><FileUploadStatus progress={fileUpload.progress} label="Uploading your studio banner" processingLabel="Saving your public studio page…" />{error && <RequestError message={error} />}<div className="flex justify-end"><NeumorphicButton type="submit" variant="accent" disabled={saving || disabled}>{saving ? "Saving…" : "Save banner"}</NeumorphicButton></div></form></NeumorphicSurface>;
  return <NeumorphicSurface className={styles.editor}>
    <div className={styles.editorHeader}><div><h2>{admin ? "Public producer profile" : "Design your studio page."}</h2><p>{admin ? "Edit this producer’s banner, sound, story and links." : "Your banner, sound, story and links. One place that feels like you."}</p></div><NeumorphicLink href={profile.publicUrl} variant="accent">View public page ↗</NeumorphicLink></div>
    <div className={styles.preview}><ProducerHero producer={draft} preview /></div>
    <DynamicForm fields={fields} values={values} onValueChange={(name, value) => { change(); setValues(current => ({ ...current, [name]: String(value) })); }} onSubmit={event => { event.preventDefault(); void save(); }} columns={2} submitLabel="Publish page changes" submittingLabel="Saving your studio…" isSubmitting={saving} disabled={disabled} errors={errors} formError={error}>
      <div className={styles.customFields}>
        <div className={styles.wideField}><DynamicFileInput label="Studio banner" name="banner" kind="image" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" maxBytes={IMAGE_SOURCE_MAX_BYTES} value={banner} onChange={file => { change(); setBanner(file); setRemoveBanner(false); }} existingUrl={removeBanner ? null : profile.bannerUrl} disabled={saving || disabled} hint="Wide artwork works best, ideally 1920 × 720. Your full image is retained so you can adjust its focal point." error={errors.banner} />{profile.bannerUrl && !banner && <NeumorphicButton className="mt-3" disabled={saving || disabled} onClick={() => { change(); setRemoveBanner(value => !value); }}>{removeBanner ? "Keep saved banner" : "Remove saved banner"}</NeumorphicButton>}<p className="mt-3 text-xs leading-6 text-muted">{admin ? "The profile photo is managed in Account identity and access below." : "Your profile photo is managed in Account profile below."}</p></div>
        <Field label="Page layout">{id => <DynamicSelect id={id} value={layout} disabled={saving} onChange={event => { change(); setLayout(event.target.value as ProducerLayout); }} options={[{ value: "IMMERSIVE", label: "Spotlight · large banner" }, { value: "COMPACT", label: "Studio · compact banner" }]} />}</Field>
        <Field label="Banner focal point">{id => <DynamicSelect id={id} value={position} disabled={saving} onChange={event => { change(); setPosition(event.target.value as BannerPosition); }} options={[{ value: "top", label: "Top" }, { value: "center", label: "Center" }, { value: "bottom", label: "Bottom" }]} />}</Field>
        <div className={styles.wideField}>{genreError && <RequestError message={`Music styles could not be loaded. ${genreError}`} retry={() => setGenreReload(value => value + 1)} />}<Field label="Your music styles">{id => <DynamicMultiSelect id={id} label="Music style" options={genres.map(genre => ({ value: genre.id, label: genre.name }))} value={genreIds} max={10} onChange={ids => { change(); setGenreIds(ids); }} />}</Field>{errors.genreIds && <p role="alert" className={styles.fieldError}>{errors.genreIds}</p>}</div>
        <div className={styles.wideField}><FeaturedBeatPicker producerId={profile.producerId} endpoint={featuredBeatsEndpoint} lookupEndpoint={featuredBeatLookupEndpoint} value={featuredIds} onChange={ids => { change(); setFeaturedIds(ids); }} disabled={saving || disabled} />{errors.featuredTrackIds && <p role="alert" className={styles.fieldError}>{errors.featuredTrackIds}</p>}</div>
        <div className={`${styles.wideField} ${styles.socialFields}`}><h3>Where listeners can find you</h3>{PRODUCER_SOCIALS.map(name => <Field key={name} label={name === "twitter" ? "X / Twitter" : name.charAt(0).toUpperCase() + name.slice(1)}>{id => <><input id={id} type="url" className={controlClass} value={socials[name]} maxLength={2048} placeholder="https://…" aria-invalid={Boolean(errors[`social_${name}`])} onChange={event => { change(); setSocials(current => ({ ...current, [name]: event.target.value })); }} />{errors[`social_${name}`] && <p role="alert" className={styles.fieldError}>{errors[`social_${name}`]}</p>}</>}</Field>)}</div>
      </div>
      <FileUploadStatus progress={fileUpload.progress} label="Uploading your studio banner" processingLabel="Saving your public studio page…" />
      {error && <NeumorphicButton disabled={saving} onClick={() => { ready.current = false; setLoading(true); setReload(value => value + 1); }}>Reload saved page</NeumorphicButton>}
    </DynamicForm>
  </NeumorphicSurface>;
}
