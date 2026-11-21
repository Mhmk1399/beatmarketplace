import { trackUploadResponse } from "@/lib/uploads/server-progress";
import { trackUploadIdentity } from "@/lib/uploads/identity";
import type { UploadStageReporter } from "@/lib/uploads/protocol";
import { validateTrackChoices } from "@/lib/marketplace/server";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { marketplaceError, MarketplaceError, parseTrackForm, producerIsPublic, requireMarketplaceRole, serializeTracks } from "@/lib/marketplace/server";
import { objectIdSchema, trackPatchSchema } from "@/lib/marketplace/validation";
import { removeStoredAssets, storeTrackMedia } from "@/lib/media/storage";
import { acquireMediaUploadLease } from "@/lib/media/upload";
import GenreModel from "@/models/Genre";
import TrackModel from "@/models/Track";
import { saveTrackWithSlug } from "@/lib/marketplace/track-slug-server";
import { issueViewToken } from "@/lib/analytics/token";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const id = objectIdSchema.parse((await context.params).id);
    await connectToDatabase();
    const track = await TrackModel.findById(id);
    if (!track) throw new MarketplaceError("This track could not be found.", 404);
    const publicTrack = track.status === "PUBLISHED" && track.visibility === "PUBLIC" && await producerIsPublic(track.producerId);
    if (!publicTrack) {
      const authentication = await authenticateRequest(request);
      if (!authentication.ok || String(track.producerId) !== authentication.user.id) throw new MarketplaceError("This track is unavailable.", 404);
    }
    const now = new Date();
    const [serialized] = await serializeTracks([track], now, { includeLicenseTerms: true, includeTaxonomy: true });
    return NextResponse.json({ track: serialized, viewToken: publicTrack ? issueViewToken(String(track._id)) : null, serverTime: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return marketplaceError(error); }
}

async function updateProducerTrack(request: Request, id: string, producerId: mongoose.Types.ObjectId, actorId: string, report: UploadStageReporter) {
  const uploadId = trackUploadIdentity(actorId, request.headers.get("x-upload-request-id"));
  let writtenKeys: string[] = [];
  let committed = false;
  let releaseUpload: (() => void) | undefined;
  let cleanUpload: (() => Promise<void>) | undefined;
  try {
    const track = await TrackModel.findOne({ _id: id, producerId }).select("+audio.master +lastUploadRequestId");
    if (!track) throw new MarketplaceError("This track could not be found.", 404);
    if (uploadId && track.lastUploadRequestId === uploadId) return NextResponse.json({ track: (await serializeTracks([track]))[0], recovered: true });
    releaseUpload = acquireMediaUploadLease();
    const form = await parseTrackForm(request);
    cleanUpload = form.cleanup;
    report("validating");
    const data = trackPatchSchema.parse(form.data);
    await validateTrackChoices(data);
    if (data.expectedVersion !== undefined && track.__v !== data.expectedVersion) throw new MarketplaceError("This beat changed. Refresh and try again.", 409);
    if (data.genreId && !await GenreModel.exists({ _id: data.genreId, isActive: true })) throw new MarketplaceError("Select an active genre.");
    const genreId = data.genreId === undefined ? track.metadata.genreId : data.genreId;
    const status = data.status ?? track.status;
    if (status === "PUBLISHED") {
      if (!genreId || !await GenreModel.exists({ _id: genreId, isActive: true })) throw new MarketplaceError("Select an active genre before publishing.");
      if (!form.artwork && !track.artwork) throw new MarketplaceError("Upload artwork before publishing.");
    }
    const start = data.previewStartSeconds ?? track.audio.previewStartSeconds ?? 0;
    const oldPreview = track.audio.preview;
    const oldArtwork = track.artwork;
    const hasMaster = Boolean(form.master || track.audio.master);
    if (!hasMaster && (form.artwork || status === "PUBLISHED")) throw new MarketplaceError("Upload the WAV master before adding artwork or publishing.");
    const replaceMedia = Boolean(form.master || form.artwork || (data.previewStartSeconds !== undefined && data.previewStartSeconds !== track.audio.previewStartSeconds) || !track.audio.preview || track.audio.preview.key.endsWith(".preview.wav"));
    if (replaceMedia && hasMaster) {
      const media = await storeTrackMedia({ master: form.master, artwork: form.artwork, previewStartSeconds: start, existingMasterKey: track.audio.master?.key, existingMaster: track.audio.master, onProgress: report });
      writtenKeys = [media.master?.key, media.preview?.key, media.artwork?.key].filter((key): key is string => Boolean(key));
      if (media.master) track.audio.master = media.master;
      if (media.preview) track.audio.preview = media.preview;
      if (media.artwork) track.artwork = media.artwork;
      track.metadata.durationSeconds = media.durationSeconds;
      track.audio.previewStartSeconds = start;
      track.audio.previewDurationSeconds = 30;
    }
    if (data.title !== undefined) track.title = data.title;
    if (data.description !== undefined) track.description = data.description;
    if (data.bpm !== undefined) track.metadata.bpm = data.bpm;
    if (data.musicalKey !== undefined) track.metadata.musicalKey = data.musicalKey;
    if (data.genreId !== undefined) track.metadata.genreId = data.genreId ? new mongoose.Types.ObjectId(data.genreId) : null;
    if (data.tags !== undefined) track.metadata.tags = data.tags;
    if (data.moodIds !== undefined) track.metadata.moodIds = data.moodIds.map(id=>new mongoose.Types.ObjectId(id));
    if (data.instrumentIds !== undefined) track.metadata.instrumentIds = data.instrumentIds.map(id=>new mongoose.Types.ObjectId(id));
    if (data.status !== undefined) track.status = data.status;
    if (data.visibility !== undefined) track.visibility = data.visibility;
    report("saving");
    track.lastUploadRequestId = uploadId ?? undefined;
    await saveTrackWithSlug(track);
    committed = true;
    // Purchased orders retain exact masters; superseded master files must remain available to entitlements.
    await removeStoredAssets([
      ...(oldPreview && oldPreview.key !== track.audio.preview?.key ? [oldPreview] : []),
      ...(oldArtwork && oldArtwork.key !== track.artwork?.key ? [oldArtwork] : []),
    ]).catch(() => console.warn("Superseded media cleanup needs retry after a successful track update."));
    const [serialized] = await serializeTracks([track]);
    return NextResponse.json({ track: serialized });
  } catch (error) {
    if (!committed && writtenKeys.length) await removeStoredAssets(writtenKeys).catch(() => undefined);
    return marketplaceError(error);
  } finally {
    try { await cleanUpload?.(); } finally { releaseUpload?.(); }
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authentication = await requireMarketplaceRole(request, "PRODUCER");
    if (!authentication.ok) return authentication.response;
    const id = objectIdSchema.parse((await context.params).id);
    return trackUploadResponse(request, report => updateProducerTrack(request, id, authentication.user._id, authentication.user.id, report), marketplaceError);
  } catch (error) { return marketplaceError(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authentication = await requireMarketplaceRole(request, "PRODUCER");
    if (!authentication.ok) return authentication.response;
    const id = objectIdSchema.parse((await context.params).id);
    const track = await TrackModel.findOne({ _id: id, producerId: authentication.user._id }).select("+audio.master");
    if (!track) throw new MarketplaceError("This track could not be found.", 404);
    track.status = "ARCHIVED";
    track.visibility = "PRIVATE";
    await saveTrackWithSlug(track);
    return NextResponse.json({ archived: true });
  } catch (error) { return marketplaceError(error); }
}
