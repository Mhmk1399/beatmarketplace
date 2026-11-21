"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { DashboardPageIntro } from "./DashboardPageIntro";
import { DynamicFileInput } from "@/components/ui/dynamic/DynamicFileInput";
import { useFileUpload } from "@/components/ui/dynamic/useFileUpload";
import {
  DynamicForm,
  type DynamicFormField,
} from "@/components/ui/dynamic/DynamicForm";
import { NeumorphicSurface } from "@/components/ui/neumorphic/Surface";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";
import {
  ApiRequestError,
  apiRequest,
  errorMessage,
  RequestError,
} from "@/components/studio/shared";
import type { WorkspaceUser } from "@/lib/workspace/types";
import { IMAGE_MAX_BYTES, IMAGE_SOURCE_MAX_BYTES } from "@/lib/images/policy";
import { ProducerPageEditor } from "@/components/producers/ProducerPageEditor";
type Values = Record<string, string | boolean>;
const profileFields: DynamicFormField<Values>[] = [
  {
    name: "firstName",
    label: "First name",
    required: true,
    colSpan: 1,
    maxLength: 80,
    autoComplete: "given-name",
  },
  {
    name: "lastName",
    label: "Last name",
    required: true,
    colSpan: 1,
    maxLength: 80,
    autoComplete: "family-name",
  },
  { name: "displayName", label: "Display name", maxLength: 120, colSpan: 1 },
  {
    name: "username",
    label: "Username",
    maxLength: 40,
    colSpan: 1,
    hint: "3–40 letters, numbers or underscores.",
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    required: true,
    maxLength: 254,
    autoComplete: "email",
    colSpan: 1,
  },
  {
    name: "phoneNumber",
    label: "Phone",
    type: "tel",
    colSpan: 1,
    hint: "Optional, with country code: +989121234567.",
  },
  { name: "bio", label: "Bio", type: "textarea", maxLength: 1000, rows: 4 },
  { name: "website", label: "Website", type: "url", maxLength: 2048 },
  { name: "city", label: "City", maxLength: 120, colSpan: 1 },
  {
    name: "countryCode",
    label: "Country code",
    maxLength: 2,
    colSpan: 1,
    hint: "Optional two-letter code, for example IR.",
  },
];
function failures(error: unknown) {
  return error instanceof ApiRequestError
    ? Object.fromEntries(
        error.issues.map((issue) => [issue.field, issue.message]),
      )
    : {};
}
function EditableForm({
  title,
  description,
  endpoint,
  objectKey,
  fields,
  onIdentitySaved,
}: {
  title: string;
  description: string;
  endpoint: string;
  objectKey: "user" | "profile" | "settings";
  fields: DynamicFormField<Values>[];
  onIdentitySaved?: () => void;
}) {
  const [values, setValues] = useState<Values>({}),
    [version, setVersion] = useState(0),
    [error, setError] = useState(""),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [reload, setReload] = useState(0);
  const avatarUpload = useFileUpload();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarInputRevision, setAvatarInputRevision] = useState(0);
  const [ready, setReady] = useState(false),
    [avatar, setAvatar] = useState<string | null>(null),
    toast = useToast(),
    auth = useAuth(),
    router = useRouter();
  function loaded(data: Record<string, unknown>) {
    const object = data[objectKey] as Record<string, unknown>;
    setValues(
      Object.fromEntries(
        fields.map((field) => [
          field.name,
          typeof object[field.name] === "boolean"
            ? (object[field.name] as boolean)
            : String(object[field.name] ?? ""),
        ]),
      ),
    );
    setVersion(Number(object.version ?? 0));
    setAvatar(typeof object.avatarUrl === "string" ? object.avatarUrl : null);
  }
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setLoading(true);
      try {
        const data = await apiRequest<Record<string, unknown>>(endpoint, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          const object = data[objectKey] as Record<string, unknown>;
          setValues(
            Object.fromEntries(
              fields.map((field) => [
                field.name,
                typeof object[field.name] === "boolean"
                  ? (object[field.name] as boolean)
                  : String(object[field.name] ?? ""),
              ]),
            ),
          );
          setVersion(Number(object.version ?? 0));
          setAvatar(
            typeof object.avatarUrl === "string" ? object.avatarUrl : null,
          );
          setReady(true);
          setError("");
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(errorMessage(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    });
    return () => controller.abort();
  }, [endpoint, objectKey, fields, reload]);
  async function save() {
    if (saving) return;
    setSaving(true);
    setError("");
    setErrors({});
    try {
      const data = await apiRequest<Record<string, unknown>>(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, expectedVersion: version }),
      });
      loaded(data);
      toast.success("Changes saved");
      if (objectKey === "user") {
        await auth.refresh();
        router.refresh();
        onIdentitySaved?.();
      }
    } catch (error) {
      setError(errorMessage(error));
      setErrors(failures(error));
    } finally {
      setSaving(false);
    }
  }
  async function upload(file: File) {
    if (file.size >= IMAGE_MAX_BYTES) {
      setError("The image must be optimized below 800 KB before uploading.");
      return;
    }
    setSaving(true);
    setError("");
    const form = new FormData();
    form.set("data", "{}");
    form.set("artwork", file);
    try {
      const data = await avatarUpload.upload<{ user: WorkspaceUser }>(
        "/api/account/avatar",
        form,
      );
      setAvatar(data.user.avatarUrl);
      setAvatarFile(null);
      setVersion(data.user.version);
      toast.success("Profile image saved");
      await auth.refresh();
      router.refresh();
      onIdentitySaved?.();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }
  async function removeAvatar() {
    if (saving || !avatar) return;
    setSaving(true);
    setError("");
    setAvatarInputRevision(value => value + 1);
    setAvatarFile(null);
    avatarUpload.reset();
    try {
      const data = await apiRequest<{ user: WorkspaceUser }>("/api/account/avatar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedVersion: version }),
      });
      setAvatar(data.user.avatarUrl);
      setVersion(data.user.version);
      toast.success("Profile image removed");
      await auth.refresh();
      router.refresh();
      onIdentitySaved?.();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }
  return (
    <NeumorphicSurface className="rounded-[var(--radius-card)] p-5 sm:p-7">
      <h2 className="text-xl font-extrabold">{title}</h2>
      <p className="mt-2 mb-6 text-sm leading-6 text-muted">{description}</p>
      {loading ? (
        <p role="status" className="text-sm text-muted">
          Loading…
        </p>
      ) : !ready ? (
        <RequestError
          message={error || "Could not load this form."}
          retry={() => setReload((value) => value + 1)}
        />
      ) : (
        <>
          {objectKey === "user" && (
            <div className="mb-7">
              <DynamicFileInput
                key={avatarInputRevision}
                label="Profile image"
                name="avatar"
                kind="image"
                accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                maxBytes={IMAGE_SOURCE_MAX_BYTES}
                value={avatarFile}
                existingUrl={avatar}
                disabled={saving}
                progress={avatarUpload.progress}
                hint="Choose a profile image up to 20 MB. It uploads after automatic optimization."
                onChange={(file) => {
                  avatarUpload.reset();
                  setAvatarFile(file);
                  setError("");
                  if (file) void upload(file);
                }}
                onRetry={
                  avatarFile
                    ? () => {
                        void upload(avatarFile);
                      }
                    : undefined
                }
              />
              {avatar && <NeumorphicButton className="mt-3" disabled={saving} onClick={() => { void removeAvatar(); }}>Remove profile image</NeumorphicButton>}
            </div>
          )}
          <DynamicForm
            fields={fields}
            values={values}
            onValueChange={(key, value) =>
              setValues((current) => ({ ...current, [key]: value }))
            }
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
            errors={errors}
            formError={error}
            submitLabel="Save changes"
            isSubmitting={saving}
            columns={2}
          />
        </>
      )}
    </NeumorphicSurface>
  );
}
export function ProfileWorkspace({ producer = false }: { producer?: boolean }) {
  const [identityRevision, setIdentityRevision] = useState(0);
  return (
    <div className="space-y-6">
      <DashboardPageIntro
        eyebrow="Your identity"
        title={producer ? "Your studio profile." : "Your profile."}
        description="Keep your account details and profile image up to date."
      />
      {producer && <ProducerPageEditor avatarRevision={identityRevision} />}
      <EditableForm
        title="Account profile"
        description="Your personal details. Changing your email or phone clears its verification status."
        endpoint="/api/account"
        objectKey="user"
        fields={profileFields}
        onIdentitySaved={producer ? () => setIdentityRevision(value => value + 1) : undefined}
      />
    </div>
  );
}
const passwordFields: DynamicFormField<Values>[] = [
  {
    name: "currentPassword",
    label: "Current password",
    type: "password",
    revealable: true,
    required: true,
    autoComplete: "current-password",
  },
  {
    name: "newPassword",
    label: "New password",
    type: "password",
    revealable: true,
    required: true,
    minLength: 8,
    maxLength: 128,
    autoComplete: "new-password",
  },
  {
    name: "confirmPassword",
    label: "Confirm new password",
    type: "password",
    revealable: true,
    required: true,
    maxLength: 128,
    autoComplete: "new-password",
  },
];
export function AccountSettings() {
  const [values, setValues] = useState<Values>({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToast();
  return (
    <NeumorphicSurface className="rounded-[var(--radius-card)] p-5 sm:p-7">
      <h2 className="text-xl font-extrabold">Password & security</h2>
      <p className="mt-2 mb-6 text-sm leading-6 text-muted">
        Choose a strong password. Other signed-in sessions will be revoked.
      </p>
      <DynamicForm
        fields={passwordFields}
        values={values}
        onValueChange={(key, value) =>
          setValues((current) => ({ ...current, [key]: value }))
        }
        submitLabel="Update password"
        isSubmitting={saving}
        formError={error}
        errors={errors}
        onSubmit={async (event) => {
          event.preventDefault();
          if (saving) return;
          setSaving(true);
          setError("");
          setErrors({});
          try {
            await apiRequest("/api/account/password", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(values),
            });
            setValues({
              currentPassword: "",
              newPassword: "",
              confirmPassword: "",
            });
            toast.success("Password updated");
          } catch (error) {
            setError(errorMessage(error));
            setErrors(failures(error));
          } finally {
            setSaving(false);
          }
        }}
      />
    </NeumorphicSurface>
  );
}
const settingsFields: DynamicFormField<Values>[] = [
  {
    name: "contactEmail",
    label: "Support email",
    type: "email",
    maxLength: 254,
    colSpan: 1,
  },
  { name: "contactPhone", label: "Contact phone", type: "tel", colSpan: 1 },
  ...(["instagram", "youtube", "tiktok", "x", "soundcloud"] as const).map(
    (name) => ({
      name,
      label:
        name === "x"
          ? "X / Twitter URL"
          : `${name[0].toUpperCase()}${name.slice(1)} URL`,
      type: "url" as const,
      maxLength: 2048,
    }),
  ),
];
export function SettingsWorkspace({ admin = false }: { admin?: boolean }) {
  return (
    <div className="space-y-6">
      <DashboardPageIntro
        eyebrow="Preferences"
        title="Settings."
        description="Manage account security and keep your workspace up to date."
      />
      {admin && (
        <EditableForm
          title="Public contact details"
          description="These details appear on the Contact page. Leave any account blank to keep its link unavailable."
          endpoint="/api/admin/settings"
          objectKey="settings"
          fields={settingsFields}
        />
      )}
      <AccountSettings />
    </div>
  );
}
