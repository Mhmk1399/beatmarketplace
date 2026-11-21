import { randomBytes } from "node:crypto";
import mongoose, { type ClientSession } from "mongoose";
import TrackModel, { type TrackDocument } from "@/models/Track";
import TrackRouteModel from "@/models/TrackRoute";
import { normalizeTrackSlug, trackSlugBase } from "./track-url";

const duplicate = (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === 11000;
// Mongoose forwards these options to the installed driver's withTransaction().
export const trackSlugTransactionOptions = { timeoutMS: 60000, maxCommitTimeMS: 5000 };

async function owner(slug: string, session: ClientSession) {
  const route = await TrackRouteModel.findById(slug).session(session).lean();
  if (route) return String(route.trackId);
  // Also protect names belonging to records not yet covered by the deployment backfill.
  const legacy = await TrackModel.findOne({ slug }).select("_id").session(session).lean();
  if (!legacy) return null;
  await TrackRouteModel.create([{ _id: slug, trackId: legacy._id }], { session });
  return String(legacy._id);
}

export async function allocateTrackSlug({ id, title, previousSlug, keepCurrent = false }: { id: string; title: string; previousSlug?: string | null; keepCurrent?: boolean }, session: ClientSession) {
  const previous = previousSlug ? normalizeTrackSlug(previousSlug) : null;
  if (previous) {
    const previousOwner = await owner(previous, session);
    if (previousOwner && previousOwner !== id) throw Object.assign(new Error("This beat URL is already reserved. Refresh and try again."), { status: 409 });
    if (!previousOwner) await TrackRouteModel.create([{ _id: previous, trackId: id }], { session });
    if (keepCurrent) return previous;
  }
  const base = trackSlugBase(title), baseOwner = await owner(base, session);
  if (!baseOwner) { await TrackRouteModel.create([{ _id: base, trackId: id }], { session }); return base; }
  if (baseOwner === id) return base;
  // Keep a previously assigned disambiguator stable when rerunning the backfill.
  if (previous?.startsWith(base + "-") && /^[a-f\d]{8}$/.test(previous.slice(base.length + 1))) return previous;
  const candidate = `${base}-${randomBytes(4).toString("hex")}`;
  await TrackRouteModel.create([{ _id: candidate, trackId: id }], { session });
  return candidate;
}

/** Save a canonical URL and its history atomically; callers already own the DB connection. */
export async function saveTrackWithSlug(track: TrackDocument) {
  if (!track.isNew && !track.isModified("title") && track.slug) return track.save();
  const wasNew = track.isNew;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await mongoose.connection.transaction(async session => {
        const previous = wasNew ? null : await TrackModel.findById(track._id).select("slug").session(session).lean();
        track.slug = await allocateTrackSlug({ id: String(track._id), title: track.title, previousSlug: previous?.slug }, session);
        await track.save({ session });
        return track;
      }, trackSlugTransactionOptions);
    } catch (error) {
      if (!duplicate(error) || attempt === 4) throw error;
    } finally { track.$session(null); }
  }
  throw new Error("The beat URL could not be saved. Please try again.");
}
