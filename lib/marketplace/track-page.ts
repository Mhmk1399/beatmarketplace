import { cache } from "react";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, resolveAuthenticatedUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import mongoose from "mongoose";
import TrackModel from "@/models/Track";
import TrackRouteModel from "@/models/TrackRoute";
import UserModel from "@/models/User";
import { normalizeTrackSlug, parseTrackReference } from "./track-url";

/** Request-local memoization shares the indexed lookup between metadata and page rendering. */
export const resolveTrackPage = cache(async (reference: string) => {
  const decoded = parseTrackReference(reference);
  if (!decoded) return null;
  await connectToDatabase();
  type Header = { _id: mongoose.Types.ObjectId; producerId: mongoose.Types.ObjectId; title: string; slug: string; description: string; artwork?: { publicUrl?: string }; status: string; visibility: string; activeProducer: boolean };
  async function lookup(match: Record<string, unknown>) {
    const [row] = await TrackModel.aggregate<Header>([
      { $match: match }, { $limit: 1 },
      { $lookup: { from: UserModel.collection.name, localField: "producerId", foreignField: "_id", pipeline: [{ $match: { status: "ACTIVE", roles: "PRODUCER" } }, { $project: { _id: 1 } }], as: "__producer" } },
      { $project: { title: 1, slug: 1, description: 1, "artwork.publicUrl": 1, producerId: 1, status: 1, visibility: 1, activeProducer: { $gt: [{ $size: "$__producer" }, 0] } } },
    ]).option({ maxTimeMS: 5000 });
    return row;
  }
  const byId = /^[a-f\d]{24}$/i.test(decoded), slug = normalizeTrackSlug(decoded);
  let track = await lookup(byId ? { _id: new mongoose.Types.ObjectId(decoded) } : { slug });
  if (!track && !byId) {
    const former = await TrackRouteModel.findById(slug).select("trackId").lean();
    if (former) track = await lookup({ _id: former.trackId });
  }
  if (!track) return null;
  const publicTrack = track.status === "PUBLISHED" && track.visibility === "PUBLIC" && track.activeProducer;
  if (!publicTrack) {
    const session = await resolveAuthenticatedUser((await cookies()).get(AUTH_COOKIE_NAME)?.value);
    if (!session.ok || String(session.user._id) !== String(track.producerId)) return null;
  }
  return { id: String(track._id), slug: track.slug, title: track.title, description: track.description, image: publicTrack ? track.artwork?.publicUrl : undefined, publicTrack };
});
