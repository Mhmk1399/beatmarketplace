import { saveTrackWithSlug } from "@/lib/marketplace/track-slug-server";
import { trackSlugBase } from "@/lib/marketplace/track-url";
import mongoose from "mongoose";
import { z } from "zod";
import TrackModel from "@/models/Track";
import GenreModel from "@/models/Genre";
import UserModel from "@/models/User";
import { trackInputSchema } from "@/lib/marketplace/validation";
import { acquireMediaUploadLease, parseBoundedTrackForm } from "@/lib/media/upload";
import { storeTrackMedia } from "@/lib/media/storage";
import { removeStoredAssets } from "@/lib/media/adapter";
import { idSchema } from "./validation";
import { json, WorkspaceError } from "./server";
import { validateTrackChoices, serializeTracks } from "@/lib/marketplace/server";
import type { ObjectStorageAsset } from "@/models/schemas/shared";
export async function mutateAdminTrack(request: Request, id?: string) {
  const release = acquireMediaUploadLease(); let cleanup: (() => Promise<void>) | undefined, committed = false;
  const written: ObjectStorageAsset[] = [];
  try {
    const form = await parseBoundedTrackForm(request); cleanup = form.cleanup;
    const schema = id ? trackInputSchema.extend({ expectedVersion: z.number().int().min(0) }) : trackInputSchema.extend({ producerId: idSchema });
    const data = schema.parse(form.data), current = id ? await TrackModel.findById(id).select("+audio.master") : null;
    if (id && !current) throw new WorkspaceError("Beat not found.", 404);
    if (current && "expectedVersion" in data && current.__v !== data.expectedVersion) throw new WorkspaceError("This beat changed. Refresh and try again.", 409);
    await validateTrackChoices(data);
    const producerId = current?.producerId ?? new mongoose.Types.ObjectId("producerId" in data ? String(data.producerId) : "");
    if (!await UserModel.exists({ _id: producerId, roles: "PRODUCER", status: "ACTIVE" })) throw new WorkspaceError("Select an active producer account.");
    if (data.genreId && !await GenreModel.exists({ _id: data.genreId, isActive: true })) throw new WorkspaceError("Select an active genre.");
    if (!current && !form.master) throw new WorkspaceError("Upload a WAV master.");
    if (data.status === "PUBLISHED" && (!data.genreId || (!form.artwork && !current?.artwork))) throw new WorkspaceError("Add a genre and artwork before publishing.");
    const track = current ?? new TrackModel({ producerId, title: data.title, slug: trackSlugBase(data.title), audio: { stems: [], previewStartSeconds: data.previewStartSeconds, previewDurationSeconds: 30 }, metadata: {} });
    const oldArtwork = track.artwork, oldPreview = track.audio.preview;
    const hasMaster = Boolean(form.master || track.audio.master);
    if (!hasMaster && (form.artwork || data.status === "PUBLISHED")) throw new WorkspaceError("Upload the WAV master before adding artwork or publishing.");
    if (hasMaster && (form.master || form.artwork || !track.audio.preview || data.previewStartSeconds !== track.audio.previewStartSeconds)) {
      const media = await storeTrackMedia({ master: form.master, artwork: form.artwork, previewStartSeconds: data.previewStartSeconds, existingMaster: track.audio.master });
      for (const asset of [media.master, media.preview, media.artwork]) if (asset) written.push(asset);
      if (media.master) track.audio.master = media.master; track.audio.preview = media.preview; if (media.artwork) track.artwork = media.artwork; track.metadata.durationSeconds = media.durationSeconds;
    }
    track.title = data.title; track.description = data.description; track.metadata.bpm = data.bpm; track.metadata.musicalKey = data.musicalKey; track.metadata.genreId = data.genreId ? new mongoose.Types.ObjectId(data.genreId) : null; track.metadata.tags = data.tags; track.metadata.moodIds = data.moodIds.map(id=>new mongoose.Types.ObjectId(id)); track.metadata.instrumentIds = data.instrumentIds.map(id=>new mongoose.Types.ObjectId(id)); track.audio.previewStartSeconds = data.previewStartSeconds; track.audio.previewDurationSeconds = 30; track.status = data.status; track.visibility = data.visibility;
    await saveTrackWithSlug(track); committed = true;
    await removeStoredAssets([...(oldArtwork && oldArtwork.key !== track.artwork?.key ? [oldArtwork] : []), ...(oldPreview && oldPreview.key !== track.audio.preview?.key ? [oldPreview] : [])]).catch(() => undefined);
    return json({ track: { ...(await serializeTracks([track]))[0], version: track.__v } }, id ? 200 : 201);
  } finally { if (!committed && written.length) await removeStoredAssets(written).catch(() => undefined); try { await cleanup?.(); } finally { release(); } }
}
