import mongoose from "mongoose";
import { hashPassword, setAuthCookie, signAccessToken } from "@/lib/auth";
import UserModel from "@/models/User";
import type { ObjectStorageAsset } from "@/models/schemas/shared";
import { acquireMediaUploadLease, parseBoundedTrackForm } from "@/lib/media/upload";
import { removeStoredAssets } from "@/lib/media/adapter";
import { storeOptimizedImage } from "@/lib/media/images";
import { ensurePlatformSettings } from "./settings";
import { idSchema, userCreateSchema, userPatchSchema } from "./validation";
import { json, readJson, requireOrigin, requireUser, userDto, WorkspaceError, workspaceError } from "./server";

export async function protectAdminUser(id: string, roles: readonly string[], status: string) {
  const settings = await ensurePlatformSettings();
  if (settings && String(settings.ownerUserId) === id && (!roles.includes("ADMIN") || status !== "ACTIVE")) throw new WorkspaceError("The platform owner's administrator access is protected.", 409);
}

/** Account identity and avatar commit in one user-document CAS; JSON remains supported. */
export async function saveAdminUser(request: Request, suppliedId?: string) {
  let form: Awaited<ReturnType<typeof parseBoundedTrackForm>> | undefined, release: (() => void) | undefined;
  let written: ObjectStorageAsset | undefined, committed = false;
  try {
    requireOrigin(request);
    const auth = await requireUser(request, "ADMIN"); if (!auth.ok) return auth.response;
    const id = suppliedId ? idSchema.parse(suppliedId) : undefined;
    let raw: unknown;
    if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
      release = acquireMediaUploadLease(); form = await parseBoundedTrackForm(request, { artworkOnly: true }); raw = form.data;
    } else raw = await readJson(request, 32 * 1024);
    const data = id ? userPatchSchema.parse(raw) : userCreateSchema.parse(raw);
    const current = id ? await UserModel.findById(id).select("+sessionVersion") : null;
    if (id && !current) throw new WorkspaceError("User not found.", 404);
    const expectedVersion = "expectedVersion" in data ? data.expectedVersion : undefined;
    if (current && expectedVersion !== (current.__v ?? 0)) throw new WorkspaceError("This user changed. Refresh and try again.", 409);
    if (!id && data.removeAvatar) throw new WorkspaceError("A new account has no saved avatar to remove.");
    if (form?.artwork && data.removeAvatar) throw new WorkspaceError("Choose either a replacement avatar or avatar removal.");
    const roles = Array.from(new Set(["USER" as const, ...data.roles]));
    if (id) await protectAdminUser(id, roles, data.status);
    if (id === auth.user.id && (data.status !== "ACTIVE" || !roles.includes("ADMIN"))) throw new WorkspaceError("Keep your own administrator access active.", 409);
    const targetId = current?._id ?? new mongoose.Types.ObjectId();
    const passwordHash = data.password ? await hashPassword(data.password) : undefined;
    const fields: Record<string, unknown> = { firstName: data.firstName, lastName: data.lastName, email: data.email, roles, status: data.status };
    const unset: Record<string, string> = {};
    if (data.phoneNumber) fields.phoneNumber = data.phoneNumber; else unset.phoneNumber = "";
    if (passwordHash) fields.passwordHash = passwordHash;
    for (const field of ["displayName", "bio", "website"] as const) if (data[field] !== undefined) fields[`profile.${field}`] = data[field];
    if (data.username !== undefined) { if (data.username) fields["profile.username"] = data.username; else unset["profile.username"] = ""; }
    if (data.city !== undefined) fields["profile.location.city"] = data.city;
    if (data.countryCode !== undefined) { if (data.countryCode) fields["profile.location.countryCode"] = data.countryCode; else unset["profile.location.countryCode"] = ""; }
    if (current && data.email !== current.email) fields.isEmailVerified = false;
    if (current && data.phoneNumber !== (current.phoneNumber ?? "")) fields.isPhoneVerified = false;
    if (form?.artwork) {
      written = await storeOptimizedImage(form.artwork, "avatar");
      written.publicUrl = `/api/account/avatar/${targetId}?v=${encodeURIComponent(written.key)}`;
      fields["profile.avatar"] = written;
    } else if (data.removeAvatar) unset["profile.avatar"] = "";
    const rolesChanged = Boolean(current && [...current.roles].sort().join(",") !== [...roles].sort().join(","));
    const invalidateSessions = Boolean(current && (passwordHash || data.status !== current.status || rolesChanged));
    let saved;
    if (current) {
      saved = await UserModel.findOneAndUpdate({ _id: targetId, __v: expectedVersion }, { $set: fields, ...(Object.keys(unset).length ? { $unset: unset } : {}), $inc: { __v: 1, ...(invalidateSessions ? { sessionVersion: 1 } : {}) } }, { returnDocument: "after", runValidators: true }).select("+sessionVersion");
      if (!saved) throw new WorkspaceError("This user changed. Refresh and try again.", 409);
    } else {
      // Dot paths are update syntax; construct the new profile explicitly for create.
      saved = await UserModel.create({ _id: targetId, firstName: data.firstName, lastName: data.lastName, email: data.email, roles, status: data.status, passwordHash,
        ...(data.phoneNumber ? { phoneNumber: data.phoneNumber } : {}), profile: { ...(data.displayName !== undefined ? { displayName: data.displayName } : {}), ...(data.username ? { username: data.username } : {}), ...(data.bio !== undefined ? { bio: data.bio } : {}), ...(data.website !== undefined ? { website: data.website } : {}), location: { ...(data.city !== undefined ? { city: data.city } : {}), ...(data.countryCode ? { countryCode: data.countryCode } : {}) }, ...(written ? { avatar: written } : {}) } });
    }
    committed = true;
    if ((written || data.removeAvatar) && current?.profile.avatar) await removeStoredAssets([current.profile.avatar]).catch(() => console.error("Replaced user avatar cleanup failed."));
    const response = json({ item: userDto(saved) }, id ? 200 : 201);
    return id === auth.user.id && invalidateSessions ? setAuthCookie(response, signAccessToken({ id: saved.id, roles: saved.roles, sessionVersion: saved.sessionVersion })) : response;
  } catch (error) {
    if (written && !committed) await removeStoredAssets([written]).catch(() => console.error("User avatar rollback failed."));
    return workspaceError(error);
  } finally { try { await form?.cleanup(); } catch { console.error("User temporary-file cleanup failed."); } finally { release?.(); } }
}
