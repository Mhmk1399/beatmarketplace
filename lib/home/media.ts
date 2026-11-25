import { unstable_cache } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { artworkUrl, previewUrl } from "@/lib/media/policy";
import HomeMediaModel from "@/models/HomeMedia";
import type { ObjectStorageAsset } from "@/models/schemas/shared";
import type { HomeImage, HomeResponsiveImage } from "./types";

export const getHomeMedia = unstable_cache(async () => {
  await connectToDatabase();
  const entries = await HomeMediaModel.find().select("asset").lean();
  return Object.fromEntries(entries.map(({ _id, asset }) => [_id, asset]));
}, ["home-media"], { revalidate: 300, tags: ["home-media"] });

type HomeMedia = Record<string, ObjectStorageAsset>;

export function isHomeImage(asset: ObjectStorageAsset) {
  return ["S3", "R2"].includes(asset.provider) && asset.mimeType === "image/webp" &&
    asset.key.endsWith(".artwork.webp") && Boolean(artworkUrl(asset));
}

export function isHomeDemo(asset: ObjectStorageAsset) {
  return ["S3", "R2"].includes(asset.provider) && asset.mimeType === "audio/mpeg" &&
    asset.key.endsWith(".preview.mp3") && Boolean(previewUrl(asset)) && asset.sizeBytes > 0 && asset.sizeBytes < 600_000;
}

export function editorialImage(media: HomeMedia, slot: string): HomeImage | undefined {
  const asset = media[slot];
  if (!asset || !isHomeImage(asset) || !asset.width || !asset.height) return;
  return { src: `/api/home/media/${slot}?v=${encodeURIComponent(asset.key)}`, width: asset.width, height: asset.height };
}

export function editorialPicture(media: HomeMedia, slot: string): HomeResponsiveImage | null {
  const base = editorialImage(media, slot);
  return base ? { base, medium: editorialImage(media, `${slot}-medium`), mobile: editorialImage(media, `${slot}-mobile`) } : null;
}
