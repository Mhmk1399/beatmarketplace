import { z } from "zod";
import TrackModel from "@/models/Track";
import StudioProductModel, {
  type StudioProductKind,
} from "@/models/StudioProduct";
import mongoose from "mongoose";
import { WorkspaceError } from "@/lib/workspace/server";
import { previewUrl } from "@/lib/media/policy";
const id = z.string().regex(/^[a-f\d]{24}$/i);
const base = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(8000).default(""),
    status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
    trackIds: z.array(id).max(100).default([]),
    videoUrl: z.string().trim().max(2048).default(""),
    priceToman: z
      .number()
      .int()
      .min(1000)
      .max(1_000_000_000)
      .nullable()
      .default(null),
    assetName: z.string().trim().max(255).default(""),
    assetMimeType: z.string().trim().max(120).default(""),
    assetSizeBytes: z.number().int().min(0).nullable().default(null),
  })
  .strict();
export const productKinds = {
  tracklists: "TRACKLIST",
  "sound-kits": "SOUND_KIT",
  services: "SERVICE",
  videos: "VIDEO",
} as const;
export function validatedVideoProvider(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new WorkspaceError("Enter a valid YouTube or Vimeo video URL.", 422);
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port)
    throw new WorkspaceError(
      "Use a standard HTTPS YouTube or Vimeo URL without credentials or a custom port.",
      422,
    );
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const youtubeId =
    host === "youtu.be"
      ? url.pathname.split("/").filter(Boolean)[0]
      : host === "youtube.com"
        ? url.pathname === "/watch"
          ? url.searchParams.get("v")
          : ["shorts", "embed"].includes(url.pathname.split("/")[1] ?? "")
            ? url.pathname.split("/")[2]
            : null
        : null;
  if (youtubeId && /^[A-Za-z0-9_-]{11}$/.test(youtubeId))
    return "YOUTUBE" as const;
  const parts = url.pathname.split("/").filter(Boolean),
    vimeoId =
      host === "vimeo.com"
        ? parts[0]
        : host === "player.vimeo.com" && parts[0] === "video"
          ? parts[1]
          : null;
  if (vimeoId && /^\d{6,12}$/.test(vimeoId)) return "VIMEO" as const;
  throw new WorkspaceError("Use a valid YouTube or Vimeo video page URL.", 422);
}
export function productInput(kind: StudioProductKind, value: unknown) {
  const data = base.parse(value);
  if (kind === "TRACKLIST" && data.trackIds.length < 1)
    throw new WorkspaceError("Select at least one owned beat.", 422);
  if (kind !== "TRACKLIST" && data.trackIds.length)
    throw new WorkspaceError("Tracks are only supported for tracklists.", 422);
  if (kind === "VIDEO") validatedVideoProvider(data.videoUrl);
  if (
    kind === "SERVICE" &&
    data.status === "PUBLISHED" &&
    data.priceToman === null
  )
    throw new WorkspaceError(
      "Set a price before publishing this service.",
      422,
    );
  return data;
}
export async function validateOwnedTracks(
  producerId: mongoose.Types.ObjectId | string,
  trackIds: string[],
) {
  if (!trackIds.length) return;
  const count = await TrackModel.countDocuments({
    _id: { $in: trackIds },
    producerId,
    status: { $ne: "ARCHIVED" },
  });
  if (count !== new Set(trackIds).size)
    throw new WorkspaceError("Select only your own available beats.", 403);
}
export async function validateTracklistPublish(
  producerId: mongoose.Types.ObjectId | string,
  trackIds: string[],
  status: "DRAFT" | "PUBLISHED",
) {
  if (status !== "PUBLISHED") return;
  const candidates = await TrackModel.find({
    _id: { $in: trackIds },
    producerId,
    status: "PUBLISHED",
    visibility: "PUBLIC",
  })
    .select("audio.preview")
    .lean();
  if (!candidates.some((track) => Boolean(previewUrl(track.audio.preview))))
    throw new WorkspaceError(
      "Publish at least one selected beat publicly with a ready preview before sharing this tracklist.",
      422,
    );
}
export function productDto(value: InstanceType<typeof StudioProductModel>) {
  return {
    id: String(value._id),
    kind: value.kind,
    title: value.title,
    description: value.description,
    status: value.status,
    trackIds: value.trackIds.map(String),
    videoUrl: value.videoUrl,
    videoProvider: value.videoProvider,
    priceToman: value.priceToman,
    assetName: value.assetName,
    assetMimeType: value.assetMimeType,
    assetSizeBytes: value.assetSizeBytes,
    hasAsset: value.assetVersion > 0,
    assetVersion: value.assetVersion,
    version: value.version,
    createdAt: value.createdAt.toISOString(),
  };
}
export function videoProvider(url: string) {
  return url ? validatedVideoProvider(url) : "";
}
