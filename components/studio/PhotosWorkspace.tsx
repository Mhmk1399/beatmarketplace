"use client";
import { useEffect, useState } from "react";
import { DashboardPageIntro } from "@/components/dashboard/DashboardPageIntro";
import { DynamicFileInput } from "@/components/ui/dynamic/DynamicFileInput";
import { useFileUpload } from "@/components/ui/dynamic/useFileUpload";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { NeumorphicSurface } from "@/components/ui/neumorphic/Surface";
import { ProducerPageEditor } from "@/components/producers/ProducerPageEditor";
import { apiRequest, errorMessage, RequestError } from "@/components/studio/shared";
import { useAuth } from "@/components/auth/AuthProvider";
import { IMAGE_SOURCE_MAX_BYTES } from "@/lib/images/policy";
import type { WorkspaceUser } from "@/lib/workspace/types";

function ProfilePhotoManager() {
  const [user, setUser] = useState<WorkspaceUser | null>(null), [file, setFile] = useState<File | null>(null), [error, setError] = useState(""), [loading, setLoading] = useState(true); const upload = useFileUpload(), auth = useAuth();
  useEffect(() => { const controller = new AbortController(); void apiRequest<{ user: WorkspaceUser }>("/api/account", { signal: controller.signal, quiet: true }).then(data => { if (!controller.signal.aborted) setUser(data.user); }).catch(value => { if (!controller.signal.aborted) setError(errorMessage(value)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, []);
  async function save(next: File) { setError(""); const body = new FormData(); body.set("data", "{}"); body.set("artwork", next); try { const data = await upload.upload<{ user: WorkspaceUser }>("/api/account/avatar", body); setUser(data.user); setFile(null); await auth.refresh(); } catch (value) { setError(errorMessage(value)); } }
  async function remove() { if (!user) return; setError(""); try { const data = await apiRequest<{ user: WorkspaceUser }>("/api/account/avatar", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedVersion: user.version }) }); setUser(data.user); await auth.refresh(); } catch (value) { setError(errorMessage(value)); } }
  return <NeumorphicSurface className="rounded-[var(--radius-card)] p-5 sm:p-7"><h2 className="text-xl font-extrabold">Profile photo</h2><p className="mt-2 mb-6 text-sm text-muted">This image identifies you in the dashboard and on your producer page.</p>{loading ? <p role="status" className="text-sm text-muted">Loading photo…</p> : user ? <><DynamicFileInput label="Profile photo" name="profile-photo" kind="image" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" maxBytes={IMAGE_SOURCE_MAX_BYTES} value={file} existingUrl={user.avatarUrl} progress={upload.progress} onChange={next => { upload.reset(); setFile(next); if (next) void save(next); }} onRetry={file ? () => void save(file) : undefined} />{user.avatarUrl && <NeumorphicButton className="mt-3" onClick={() => void remove()}>Remove profile photo</NeumorphicButton>}</> : <RequestError message={error || "The profile photo could not be loaded."} />}{error && user && <RequestError message={error} />}</NeumorphicSurface>;
}
export function PhotosWorkspace() { return <div className="space-y-6"><DashboardPageIntro eyebrow="Content" title="Profile photo and studio banner" description="Manage the two images used by your producer identity. This is not a public photo gallery." /><ProfilePhotoManager /><ProducerPageEditor mediaOnly /></div>; }
