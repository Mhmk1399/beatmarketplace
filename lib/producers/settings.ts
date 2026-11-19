import ProducerProfileModel from "@/models/ProducerProfile";
import GenreModel from "@/models/Genre";
import TrackModel from "@/models/Track";
import type { ObjectStorageAsset } from "@/models/schemas/shared";
import { acquireMediaUploadLease, parseBoundedTrackForm } from "@/lib/media/upload";
import { storeOptimizedImage } from "@/lib/media/images";
import { removeStoredAssets } from "@/lib/media/adapter";
import { json, readJson, requireOrigin, requireUser, WorkspaceError, workspaceError } from "@/lib/workspace/server";
import { publicTrackFilter } from "@/lib/marketplace/server";
import { producerPageSettingsSchema } from "./validation";
import { producerSettingsDto } from "./server";

/** Settings, selected beats and a new banner commit in one version-checked document. */
export async function saveProducerSettings(request: Request) {
  let form: Awaited<ReturnType<typeof parseBoundedTrackForm>> | undefined, release: (() => void) | undefined;
  let written: ObjectStorageAsset | undefined, committed = false;
  try {
    requireOrigin(request); const auth = await requireUser(request, "PRODUCER"); if (!auth.ok) return auth.response;
    let raw: unknown;
    if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
      release = acquireMediaUploadLease(); form = await parseBoundedTrackForm(request, { imageFields: ["banner"] }); raw = form.data;
    } else raw = await readJson(request, 32 * 1024);
    const { expectedVersion, removeBanner, ...fields } = producerPageSettingsSchema.parse(raw);
    const previous = await ProducerProfileModel.findOne({ userId: auth.user._id });
    if (expectedVersion !== (previous?.__v ?? 0)) throw new WorkspaceError("Your studio page changed. Reload before saving.", 409);
    if (form?.banner && removeBanner) throw new WorkspaceError("Choose either a new banner or banner removal.");
    if (fields.genreIds?.length && await GenreModel.countDocuments({ _id: { $in: fields.genreIds }, isActive: true }) !== fields.genreIds.length) throw new WorkspaceError("Choose only active music styles.");
    if (fields.featuredTrackIds?.length && await TrackModel.countDocuments({ _id: { $in: fields.featuredTrackIds }, producerId: auth.user._id, ...publicTrackFilter }) !== fields.featuredTrackIds.length) throw new WorkspaceError("Featured beats must be your own published, public beats.");
    if (form?.banner) { written = await storeOptimizedImage(form.banner, "artwork"); delete written.publicUrl; }
    const updates = { ...fields, ...(written ? { banner: written } : {}) };
    const profile = previous ? await ProducerProfileModel.findOneAndUpdate({ _id: previous._id, userId: auth.user._id, __v: expectedVersion }, {
      $set: updates, $inc: { __v: 1 }, ...(removeBanner ? { $unset: { banner: "" } } : {}),
    }, { returnDocument: "after", runValidators: true }) : await ProducerProfileModel.create({ ...updates, userId: auth.user._id });
    if (!profile) throw new WorkspaceError("Your studio page changed. Reload before saving.", 409);
    committed = true;
    if ((written || removeBanner) && previous?.banner) await removeStoredAssets([previous.banner]).catch(() => console.error("Replaced producer banner cleanup failed."));
    return json({ profile: producerSettingsDto(profile, auth.user) });
  } catch (error) {
    if (written && !committed) await removeStoredAssets([written]).catch(() => console.error("Producer banner rollback failed."));
    if (typeof error === "object" && error && "code" in error && error.code === 11000) return json({ error: "Your studio page changed. Reload before saving." }, 409);
    return workspaceError(error);
  } finally { try { await form?.cleanup(); } catch { console.error("Producer temporary-file cleanup failed."); } finally { release?.(); } }
}
