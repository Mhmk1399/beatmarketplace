import type { ObjectStorageAsset } from "@/models/schemas/shared";
import { previewUrl } from "./policy";
import { MediaValidationError } from "./wav";

export function previewDeliveryConfiguration() {
  const mode = process.env.MEDIA_PREVIEW_DELIVERY?.trim() || "cache";
  if (mode === "cache") return { mode: "cache" as const, base: null };
  if (mode !== "cdn") throw new MediaValidationError("Choose cache or cdn for preview delivery.", 503);
  let base: URL;
  try { base = new URL(process.env.MEDIA_PREVIEW_CDN_BASE_URL || ""); }
  catch { throw new MediaValidationError("Preview delivery is not configured.", 503); }
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) throw new MediaValidationError("Preview delivery requires a valid HTTPS address.", 503);
  return { mode: "cdn" as const, base };
}

/** Optional edge delivery is restricted to public preview assets by the calling route. */
export function previewCdnUrl(asset: ObjectStorageAsset) {
  if (!previewUrl(asset) || !asset.key.endsWith(".preview.mp3")) return null;
  const config = previewDeliveryConfiguration();
  if (config.mode === "cache") return null;
  const base = config.base;
  const stored = asset.storageKey || asset.key;
  if (!/^[a-zA-Z0-9/_\-.]+$/.test(stored) || stored.split("/").includes("..") || !stored.endsWith(asset.key)) throw new MediaValidationError("Invalid preview location.", 404);
  base.pathname = `${base.pathname.replace(/\/$/, "")}/${stored}`;
  return base.href;
}
