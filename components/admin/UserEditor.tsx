"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { DynamicForm, type DynamicFormField } from "@/components/ui/dynamic/DynamicForm";
import { DynamicFileInput, FileUploadStatus } from "@/components/ui/dynamic/DynamicFileInput";
import { DynamicModal } from "@/components/ui/dynamic/DynamicModal";
import { useFileUpload } from "@/components/ui/dynamic/useFileUpload";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { ApiRequestError, apiRequest, errorMessage } from "@/components/studio/shared";
import { IMAGE_SOURCE_MAX_BYTES } from "@/lib/images/policy";
import { userCreateSchema, userPatchSchema } from "@/lib/workspace/validation";
import type { WorkspaceUser } from "@/lib/workspace/types";

type Values = Record<string, string | boolean>;
type Props = {
  item: WorkspaceUser | null;
  onClose: () => void;
  onSaved: (user: WorkspaceUser) => void;
  embedded?: boolean;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
};

function fields(user: WorkspaceUser | null): DynamicFormField<Values>[] {
  return [
    { name: "firstName", label: "First name", required: true, maxLength: 80, colSpan: 1 },
    { name: "lastName", label: "Last name", required: true, maxLength: 80, colSpan: 1 },
    { name: "displayName", label: "Display name", maxLength: 120, colSpan: 1 },
    { name: "username", label: "Username", maxLength: 40, colSpan: 1, hint: "3–40 letters, numbers or underscores. This also identifies the public producer page." },
    { name: "bio", label: "Account bio", type: "textarea", maxLength: 1000, rows: 4 },
    { name: "website", label: "Account website", type: "url", maxLength: 2048 },
    { name: "city", label: "City", maxLength: 120, colSpan: 1 },
    { name: "countryCode", label: "Country code", maxLength: 2, colSpan: 1, hint: "Optional two-letter code, for example IR." },
    { name: "email", label: "Email", type: "email", required: true, maxLength: 254 },
    { name: "phoneNumber", label: "Phone number", type: "tel", hint: "Optional, with country code: +989121234567." },
    { name: "password", label: user ? "New password" : "Password", type: "password", revealable: true, required: !user, minLength: 8, maxLength: 128, autoComplete: "new-password", hint: user ? "Leave empty to keep the current password." : "Use at least 8 characters." },
    { name: "producer", label: "Producer access", type: "checkbox" },
    { name: "admin", label: "Administrator access", type: "checkbox" },
    { name: "status", label: "Account status", type: "select", options: [{ value: "ACTIVE", label: "Active" }, { value: "SUSPENDED", label: "Suspended" }, { value: "DEACTIVATED", label: "Deactivated" }] },
  ];
}

function formValues(user: WorkspaceUser | null): Values {
  return { firstName: user?.firstName ?? "", lastName: user?.lastName ?? "", displayName: user?.displayName ?? "", username: user?.username ?? "", bio: user?.bio ?? "", website: user?.website ?? "", city: user?.city ?? "", countryCode: user?.countryCode ?? "", email: user?.email ?? "", phoneNumber: user?.phoneNumber ?? "", password: "", producer: user?.roles.includes("PRODUCER") ?? false, admin: user?.roles.includes("ADMIN") ?? false, status: user?.status ?? "ACTIVE" };
}

export function UserEditor({ item, onClose, onSaved, embedded = false, disabled = false, onBusyChange }: Props) {
  const [user, setUser] = useState(item), [values, setValues] = useState<Values>(() => formValues(item));
  const [artwork, setArtwork] = useState<File | null>(null), [removeAvatar, setRemoveAvatar] = useState(false);
  const [avatarInputRevision, setAvatarInputRevision] = useState(0);
  const [saving, setSaving] = useState(false), [error, setError] = useState(""), [errors, setErrors] = useState<Record<string, string>>({});
  const fileUpload = useFileUpload(), toast = useToast(), auth = useAuth(), router = useRouter();
  function change() { setError(""); setErrors({}); fileUpload.reset(); }
  async function save() {
    if (saving || disabled) return;
    const payload = { firstName: values.firstName, lastName: values.lastName, displayName: values.displayName, username: values.username, bio: values.bio, website: values.website, city: values.city, countryCode: values.countryCode, email: values.email, phoneNumber: values.phoneNumber, password: values.password, roles: ["USER", ...(values.producer ? ["PRODUCER"] : []), ...(values.admin ? ["ADMIN"] : [])], status: values.status, ...(user ? { expectedVersion: user.version, removeAvatar } : {}) };
    const parsed = user ? userPatchSchema.safeParse(payload) : userCreateSchema.safeParse(payload);
    if (!parsed.success) { setError("Please review the highlighted fields."); setErrors(Object.fromEntries(parsed.error.issues.map(issue => [issue.path.join("."), issue.message]))); return; }
    setSaving(true); onBusyChange?.(true); setError(""); setErrors({});
    try {
      const endpoint = user ? `/api/admin/users/${user.id}` : "/api/admin/users", method = user ? "PATCH" : "POST";
      let result: { item: WorkspaceUser };
      if (artwork) { const body = new FormData(); body.set("data", JSON.stringify(parsed.data)); body.set("artwork", artwork); result = await fileUpload.upload(endpoint, body, method); }
      else result = await apiRequest(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      setUser(result.item); setValues(formValues(result.item)); setArtwork(null); setRemoveAvatar(false);
      toast.success(user ? "Account changes saved" : "User created");
      if (result.item.id === auth.user?.id) { await auth.refresh(); router.refresh(); }
      onSaved(result.item);
    } catch (error) {
      setError(errorMessage(error));
      if (error instanceof ApiRequestError) setErrors(Object.fromEntries(error.issues.map(issue => [issue.field === "roles" ? "admin" : issue.field === "artwork" ? "avatar" : issue.field, issue.message])));
    } finally { setSaving(false); onBusyChange?.(false); }
  }
  const form = <DynamicForm fields={fields(user)} values={values} onValueChange={(name, value) => { change(); setValues(current => ({ ...current, [name]: value })); }} onSubmit={event => { event.preventDefault(); void save(); }} errors={errors} formError={error} submitLabel={user ? "Save account changes" : "Create user"} isSubmitting={saving} disabled={disabled} columns={2} actions={!embedded && <NeumorphicButton disabled={saving} onClick={onClose}>Cancel</NeumorphicButton>}>
    <DynamicFileInput key={avatarInputRevision} label="Profile image" name="artwork" kind="image" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" maxBytes={IMAGE_SOURCE_MAX_BYTES} value={artwork} onChange={file => { change(); setArtwork(file); setRemoveAvatar(false); }} existingUrl={removeAvatar ? null : user?.avatarUrl} existingName={user?.avatarUrl && !removeAvatar ? "Current profile image" : undefined} disabled={saving || disabled} error={errors.avatar} hint="Choose a profile image. The image is saved with the account changes." />
    {user?.avatarUrl && !artwork && <NeumorphicButton disabled={saving || disabled} onClick={() => { change(); setAvatarInputRevision(value => value + 1); setRemoveAvatar(value => !value); }}>{removeAvatar ? "Keep saved profile image" : "Remove saved profile image"}</NeumorphicButton>}
    {removeAvatar && <p className="text-sm text-muted" role="status">The saved profile image will be removed when you save.</p>}
    <FileUploadStatus progress={fileUpload.progress} label="Uploading profile image" processingLabel="Saving the account…" />
  </DynamicForm>;
  return embedded ? form : <DynamicModal open size="lg" title={user ? `Edit ${user.firstName} ${user.lastName}` : "Create user"} onClose={() => { if (!saving) onClose(); }} closeOnBackdrop={!saving}>{form}</DynamicModal>;
}
