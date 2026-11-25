import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ObjectStorageAsset } from "@/models/schemas/shared";
import {
  assetReference,
  byteLimit,
  copyStoredMaster,
  putMediaFile,
  removeStoredAssets,
  storedAssetStream,
} from "./adapter";
import { mediaDriver, s3Configuration } from "./config";
import { isSpooledFile, type MediaUpload } from "./types";
import { prepareStoredImage } from "./images";
import { createWavPreviewFile } from "./wav-file";
import { encryptSoundKit } from "@/lib/sound-kits/crypto";
import { isStructurallyValidZip } from "./paid-assets";
import { encodePreview } from "./preview";
import { seedPreviewCache } from "./preview-cache";
import { MAX_MASTER_BYTES, MediaValidationError } from "./wav";
import type { UploadStageReporter } from "@/lib/uploads/protocol";

export { MediaValidationError } from "./wav";
export { mediaPath, partitionedMediaKey, removeStoredAssets } from "./adapter";
export { serveStoredAsset, parseMediaRange } from "./delivery";
export type { UploadedMediaFile } from "./types";

/** Bounded compatibility helper for tooling; HTTP delivery uses serveStoredAsset instead. */
export async function readStoredAsset(
  key: string,
  supplied?: ObjectStorageAsset,
  maxBytes = MAX_MASTER_BYTES + 44,
) {
  const asset = supplied || { ...assetReference(key), storageKey: undefined };
  const source = await storedAssetStream(asset);
  const chunks: Buffer[] = [];
  let bytes = 0;
  const limiter = byteLimit(maxBytes);
  const limited = source.pipe(limiter);
  source.once("error", (error: Error) => limiter.destroy(error));
  try {
    for await (const chunk of limited) {
      const data = Buffer.from(chunk);
      chunks.push(data);
      bytes += data.length;
    }
    return Buffer.concat(chunks, bytes);
  } finally {
    source.destroy();
  }
}

async function materializeUpload(file: MediaUpload, target: string) {
  if (isSpooledFile(file)) return file.path;
  await pipeline(
    Readable.fromWeb(
      file.stream() as import("node:stream/web").ReadableStream<Uint8Array>,
    ),
    createWriteStream(/* turbopackIgnore: true */ target, {
      flags: "wx",
      mode: 0o600,
    }),
  );
  return target;
}

export async function storeTrackMedia(input: {
  master?: MediaUpload;
  fullMp3?: MediaUpload;
  stems?: MediaUpload;
  artwork?: MediaUpload;
  previewStartSeconds: number;
  existingMasterKey?: string;
  existingMaster?: ObjectStorageAsset;
  onProgress?: UploadStageReporter;
}) {
  if (input.master && input.master.size > MAX_MASTER_BYTES)
    throw new MediaValidationError("WAV files must be at most 60 MB.", 413);
  if (input.artwork && input.artwork.size > 5 * 1024 * 1024)
    throw new MediaValidationError("Artwork must be at most 5 MB.", 413);
  if (mediaDriver() === "s3") s3Configuration();
  const directory = await mkdtemp(path.join(os.tmpdir(), "beat-process-"));
  const written: ObjectStorageAsset[] = [];
  try {
    input.onProgress?.("validating");
    let sourcePath: string;
    if (input.master)
      sourcePath = await materializeUpload(
        input.master,
        path.join(directory, "source.wav"),
      );
    else {
      const existing =
        input.existingMaster ||
        (input.existingMasterKey
          ? {
              ...assetReference(input.existingMasterKey),
              storageKey: undefined,
            }
          : null);
      if (!existing)
        throw new MediaValidationError("A WAV master is required.");
      sourcePath = path.join(directory, "source.wav");
      await copyStoredMaster(existing, sourcePath);
    }
    const croppedPath = path.join(directory, "cropped.wav");
    const previewPath = path.join(directory, "preview.mp3");
    const { durationSeconds } = await createWavPreviewFile(
      sourcePath,
      croppedPath,
      input.previewStartSeconds,
    );
    input.onProgress?.("previewing");
    await encodePreview(croppedPath, previewPath);
    let artwork: Awaited<ReturnType<typeof prepareStoredImage>> | undefined;
    if (input.artwork) {
      const imagePath = await materializeUpload(
        input.artwork,
        path.join(directory, "artwork"),
      );
      artwork = await prepareStoredImage(
        {
          path: imagePath,
          name: input.artwork.name,
          size: input.artwork.size,
          type: input.artwork.type,
        },
        "artwork",
      );
    }
    input.onProgress?.("storing");
    const preview = await putMediaFile(
      previewPath,
      "preview.mp3",
      "preview.mp3",
      "audio/mpeg",
      30,
    );
    written.push(preview);
    seedPreviewCache(preview, await readFile(previewPath));
    const result: {
      master?: ObjectStorageAsset;
      fullMp3?: ObjectStorageAsset;
      stems?: ObjectStorageAsset;
      preview: ObjectStorageAsset;
      artwork?: ObjectStorageAsset;
      durationSeconds: number;
    } = { preview, durationSeconds };
    if (input.master) {
      const encryptedPath = path.join(directory, "master.enc");
      await writeFile(
        encryptedPath,
        encryptSoundKit(await readFile(sourcePath)),
        { mode: 0o600 },
      );
      result.master = await putMediaFile(
        encryptedPath,
        "master.enc",
        input.master.name,
        "application/octet-stream",
        durationSeconds,
      );
      written.push(result.master);
    }
    if (input.fullMp3) {
      if (!input.fullMp3.name.toLowerCase().endsWith(".mp3"))
        throw new MediaValidationError(
          "The full MP3 must be an .mp3 file.",
          415,
        );
      const source = await materializeUpload(
        input.fullMp3,
        path.join(directory, "full.mp3"),
      );
      await encodePreview(source, path.join(directory, "mp3-validation.mp3"), {
        format: "mp3",
        fullLength: true,
      });
      const header = await readFile(source);
      const encryptedPath = path.join(directory, "full-mp3.enc");
      await writeFile(encryptedPath, encryptSoundKit(header), { mode: 0o600 });
      result.fullMp3 = await putMediaFile(
        encryptedPath,
        "full-mp3.enc",
        input.fullMp3.name,
        "application/octet-stream",
      );
      written.push(result.fullMp3);
    }
    if (input.stems) {
      if (!input.stems.name.toLowerCase().endsWith(".zip"))
        throw new MediaValidationError(
          "Stems must be supplied as a ZIP archive.",
          415,
        );
      const source = await materializeUpload(
        input.stems,
        path.join(directory, "stems.zip"),
      );
      const bytes = await readFile(source);
      if (!isStructurallyValidZip(bytes))
        throw new MediaValidationError("The stems ZIP is invalid.", 422);
      const encryptedPath = path.join(directory, "stems.enc");
      await writeFile(encryptedPath, encryptSoundKit(bytes), { mode: 0o600 });
      result.stems = await putMediaFile(
        encryptedPath,
        "stems.enc",
        input.stems.name,
        "application/octet-stream",
      );
      written.push(result.stems);
    }
    if (artwork && input.artwork) {
      result.artwork = await putMediaFile(
        artwork.path,
        "artwork.webp",
        `${path.parse(input.artwork.name).name}.webp`,
        "image/webp",
      );
      result.artwork.width = artwork.width;
      result.artwork.height = artwork.height;
      written.push(result.artwork);
    }
    return result;
  } catch (error) {
    await removeStoredAssets(written).catch(() => undefined);
    throw error;
  } finally {
    const absolute = path.resolve(directory);
    if (
      path.dirname(absolute) === path.resolve(os.tmpdir()) &&
      path.basename(absolute).startsWith("beat-process-")
    )
      await rm(absolute, { recursive: true, force: true });
  }
}
