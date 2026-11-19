import path from "node:path";
import { MediaValidationError } from "./wav";

export function localMediaRoot() {
  // A runtime volume must not be included in the Next.js deployment artifact.
  return path.resolve(/* turbopackIgnore: true */ process.env.MEDIA_STORAGE_DIR || path.join(process.cwd(), ".data", "media"));
}

export function mediaDriver(): "local" | "s3" {
  const driver = process.env.MEDIA_STORAGE_DRIVER || "local";
  if (driver !== "local" && driver !== "s3") throw new MediaValidationError("Unsupported media storage configuration.", 503);
  return driver;
}

export function s3DeliveryMode(): "redirect" | "proxy" {
  const mode = process.env.MEDIA_S3_DELIVERY_MODE || "redirect";
  if (mode !== "redirect" && mode !== "proxy") throw new MediaValidationError("Unsupported object delivery configuration.", 503);
  return mode;
}

export function s3Configuration() {
  const bucket = process.env.MEDIA_S3_BUCKET;
  const provider = process.env.MEDIA_S3_PROVIDER || "S3";
  if (provider !== "S3" && provider !== "R2") throw new MediaValidationError("Unsupported object storage provider.", 503);
  const region = process.env.MEDIA_S3_REGION || (provider === "R2" ? "auto" : "us-east-1");
  const endpoint = process.env.MEDIA_S3_ENDPOINT;
  const accessKeyId = process.env.MEDIA_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.MEDIA_S3_SECRET_ACCESS_KEY;
  const prefix = (process.env.MEDIA_S3_PREFIX || "beatmarket").trim().replace(/^\/+|\/+$/g, "");
  if (!bucket || !accessKeyId || !secretAccessKey || !/^[a-zA-Z0-9/_-]+$/.test(prefix) || prefix.includes("..")) {
    throw new MediaValidationError("Object storage is not configured. Please contact the administrator.", 503);
  }
  if (endpoint) {
    let url: URL;
    try { url = new URL(endpoint); } catch { throw new MediaValidationError("Invalid object storage endpoint.", 503); }
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || (process.env.NODE_ENV === "production" && url.protocol !== "https:")) {
      throw new MediaValidationError("Object storage must use a valid HTTPS endpoint in production.", 503);
    }
  }
  return { bucket, region, endpoint, accessKeyId, secretAccessKey, prefix,
    forcePathStyle: process.env.MEDIA_S3_FORCE_PATH_STYLE === "true",
    provider: provider as "S3" | "R2" };
}

export function configuredUploadConcurrency() {
  const value = Number(process.env.MEDIA_UPLOAD_CONCURRENCY || 2);
  return Number.isInteger(value) && value >= 1 && value <= 8 ? value : 2;
}
