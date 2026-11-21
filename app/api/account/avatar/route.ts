import { z } from "zod";
import UserModel from "@/models/User";
import { acquireMediaUploadLease, parseBoundedTrackForm } from "@/lib/media/upload";
import { removeStoredAssets } from "@/lib/media/adapter";
import { storeOptimizedImage } from "@/lib/media/images";
import { json, readJson, requireOrigin, requireUser, userDto, WorkspaceError, workspaceError } from "@/lib/workspace/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  let cleanup: (() => Promise<void>) | undefined, release: (() => void) | undefined;
  let written: Awaited<ReturnType<typeof storeOptimizedImage>> | undefined, committed = false;
  try { requireOrigin(request); const auth = await requireUser(request); if (!auth.ok) return auth.response; release = acquireMediaUploadLease(); const form = await parseBoundedTrackForm(request, { artworkOnly: true }); cleanup = form.cleanup; if (!form.artwork) throw new WorkspaceError("Choose a PNG, JPEG or WebP image.");
    written = await storeOptimizedImage(form.artwork, "avatar"); written.publicUrl = `/api/account/avatar/${auth.user.id}?v=${written.key}`;
    const previous = auth.user.profile.avatar;
    const saved = await UserModel.findOneAndUpdate({ _id: auth.user._id, __v: auth.user.__v ?? 0 }, { $set: { "profile.avatar": written }, $inc: { __v: 1 } }, { returnDocument: "after", runValidators: true });
    if (!saved) throw new WorkspaceError("Your profile changed. Please upload again.", 409); committed = true; if (previous) await removeStoredAssets([previous]).catch(() => undefined); return json({ user: userDto(saved) });
  } catch (error) { if (written && !committed) await removeStoredAssets([written]).catch(() => undefined); return workspaceError(error); }
  finally { try { await cleanup?.(); } catch { console.error("Account avatar temporary-file cleanup failed."); } finally { release?.(); } }
}

export async function DELETE(request: Request) {
  try {
    requireOrigin(request);
    const auth = await requireUser(request);
    if (!auth.ok) return auth.response;
    const { expectedVersion } = z.object({ expectedVersion: z.number().int().min(0) }).strict().parse(await readJson(request));
    if (expectedVersion !== (auth.user.__v ?? 0)) throw new WorkspaceError("Your account changed. Refresh and try again.", 409);
    const previous = auth.user.profile?.avatar;
    const saved = await UserModel.findOneAndUpdate(
      { _id: auth.user._id, __v: expectedVersion },
      { $unset: { "profile.avatar": "" }, $inc: { __v: 1 } },
      { returnDocument: "after", runValidators: true },
    );
    if (!saved) throw new WorkspaceError("Your account changed. Refresh and try again.", 409);
    if (previous) await removeStoredAssets([previous]).catch(() => console.error("Removed account avatar cleanup failed."));
    return json({ user: userDto(saved) });
  } catch (error) {
    return workspaceError(error);
  }
}
