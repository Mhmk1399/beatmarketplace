import { randomUUID } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { IMAGE_MAX_BYTES, IMAGE_MAX_PASSES, nextImagePass } from "@/lib/images/policy";
import { putMediaFile } from "./adapter";
import type { UploadedMediaFile } from "./types";
import { MediaValidationError } from "./wav";
import { MAX_ARTWORK_BYTES } from "./upload";

type ImageRole = "avatar" | "thumbnail" | "banner" | "artwork";
const sizes = { avatar: [512, 512], thumbnail: [600, 600], banner: [1920, 720], artwork: [2048, 2048] } as const;

/** Validate and bound every image before storage, including direct API uploads. */
export async function prepareStoredImage(file: UploadedMediaFile, role: ImageRole) {
  const details = await stat(file.path);
  if (details.size > MAX_ARTWORK_BYTES) throw new MediaValidationError("Images must be at most 5 MB after browser optimization.", 413);
  // Bounded image bytes avoid libvips retaining temporary-file handles on Windows.
  const input = await readFile(file.path), header = input.subarray(0, 16);
  const supported = header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || (header[0] === 255 && header[1] === 216 && header[2] === 255)
    || (header.toString("ascii", 0, 4) === "RIFF" && header.toString("ascii", 8, 12) === "WEBP");
  if (!supported) throw new MediaValidationError("Choose a PNG, JPEG or WebP image.");
  try {
    const options = { limitInputPixels: 16_000_000, failOn: "error" as const };
    const metadata = await sharp(input, options).metadata();
    const [maxWidth, maxHeight] = sizes[role];
    const fits = metadata.width && metadata.height && metadata.width <= maxWidth && metadata.height <= maxHeight
      && (role === "artwork" || Math.abs(metadata.width / metadata.height - maxWidth / maxHeight) < .005);
    if (metadata.format === "webp" && input.length < IMAGE_MAX_BYTES && fits && (metadata.pages ?? 1) === 1
      && !metadata.exif && !metadata.icc && !metadata.xmp && !metadata.orientation) {
      // Validate the complete raster, retaining already prepared WebP bytes.
      await sharp(input, options).resize(1, 1).raw().toBuffer();
      return { path: file.path, size: input.length, width: metadata.width!, height: metadata.height! };
    }
    const { data, info } = await sharp(input, options).rotate()
      .resize(maxWidth, maxHeight, { fit: role === "artwork" ? "inside" : "cover", withoutEnlargement: true })
      .toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
    let width = info.width, height = info.height, quality = .84;
    for (let pass = 0; pass < IMAGE_MAX_PASSES; pass++) {
      const output = await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
        .resize(width, height, { fit: "fill" }).webp({ quality: Math.round(quality * 100), effort: 3 }).toBuffer();
      if (output.length < IMAGE_MAX_BYTES) {
        const target = path.join(path.dirname(file.path), `${role}-${randomUUID()}.webp`);
        await writeFile(target, output, { flag: "wx", mode: 0o600 });
        return { path: target, size: output.length, width, height };
      }
      ({ width, height, quality } = nextImagePass(width, height, quality, output.length, IMAGE_MAX_BYTES));
    }
    throw new MediaValidationError("This image could not be reduced below 800 KB. Choose a smaller image.");
  } catch (error) {
    if (error instanceof MediaValidationError) throw error;
    throw new MediaValidationError("This image could not be read. Use a PNG, JPEG or WebP up to 16 megapixels.");
  }
}

export async function storeOptimizedImage(file: UploadedMediaFile, role: ImageRole) {
  const image = await prepareStoredImage(file, role);
  const asset = await putMediaFile(image.path, "artwork.webp", `${path.parse(file.name).name}.webp`, "image/webp");
  asset.width = image.width; asset.height = image.height;
  return asset;
}

export async function storeCategoryImage(file: UploadedMediaFile, slot: "thumbnail" | "banner") {
  const asset = await storeOptimizedImage(file, slot);
  delete asset.publicUrl;
  return asset;
}
