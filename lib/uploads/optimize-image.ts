import { IMAGE_MAX_BYTES, IMAGE_MAX_EDGE } from "@/lib/images/policy";
import type { ImageOptions, ImageResult } from "./image-core";

const prepared = new WeakSet<File>();
let queue: Promise<unknown> = Promise.resolve(), pending = 0;
export class ImageOptimizationError extends Error { constructor(message: string) { super(message); this.name = "ImageOptimizationError"; } }
const aborted = () => new DOMException("Image preparation cancelled.", "AbortError");

export function isImageUpload(value: FormDataEntryValue): value is File {
  return value instanceof File && (/^image\//i.test(value.type) || /\.(png|jpe?g|webp)$/i.test(value.name));
}

async function mainThread(file: File, options: ImageOptions, signal?: AbortSignal) {
  const { inspectImage, decodeImage, compressImage } = await import("./image-core");
  await inspectImage(file);
  if (signal?.aborted) throw aborted();
  let source: ImageBitmap | HTMLImageElement, objectUrl: string | undefined;
  if (typeof createImageBitmap === "function") source = await decodeImage(file, options);
  else {
    source = new Image(); objectUrl = URL.createObjectURL(file); source.src = objectUrl;
    try { await source.decode(); } catch { URL.revokeObjectURL(objectUrl); throw new ImageOptimizationError("This image could not be read."); }
  }
  const canvas = document.createElement("canvas"), context = canvas.getContext("2d");
  try {
    if (!context) throw new ImageOptimizationError("Image conversion is unavailable in this browser.");
    return await compressImage(source, source instanceof HTMLImageElement ? source.naturalWidth : source.width, source instanceof HTMLImageElement ? source.naturalHeight : source.height, {
      draw(image, width, height) { canvas.width = width; canvas.height = height; context.imageSmoothingQuality = "high"; context.drawImage(image, 0, 0, width, height); },
      encode: quality => new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new ImageOptimizationError("The image could not be encoded.")), "image/webp", quality)),
      dispose() { canvas.width = canvas.height = 1; },
    }, options, () => Boolean(signal?.aborted), () => new Promise(resolve => setTimeout(resolve, 0)));
  } finally { if ("close" in source) source.close(); if (objectUrl) URL.revokeObjectURL(objectUrl); }
}

async function workerImage(file: File, options: ImageOptions, signal?: AbortSignal): Promise<ImageResult> {
  if (typeof Worker === "undefined") return mainThread(file, options, signal);
  const result = await new Promise<ImageResult | null>((resolve, reject) => {
    let worker: Worker;
    try { worker = new Worker(new URL("./image-optimizer.worker.ts", import.meta.url), { type: "module", name: "beat-image-optimizer" }); }
    catch { resolve(null); return; }
    const cleanup = () => { clearTimeout(timeout); signal?.removeEventListener("abort", cancel); worker.terminate(); };
    const cancel = () => { cleanup(); reject(aborted()); };
    const timeout = setTimeout(() => { cleanup(); reject(new ImageOptimizationError("Image preparation took too long. Choose a smaller image.")); }, 12000);
    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) { cancel(); return; }
    worker.onmessage = (event: MessageEvent<{ result?: ImageResult; error?: string; unsupported?: boolean }>) => {
      cleanup();
      if (event.data.error) reject(new ImageOptimizationError(event.data.error));
      else resolve(event.data.result ?? null);
    };
    worker.onerror = event => { event.preventDefault(); cleanup(); resolve(null); };
    worker.postMessage({ file, options });
  });
  return result ?? mainThread(file, options, signal);
}

/** Lazy, native encoding with one active image job; audio files never enter this path. */
export async function optimizeImageFile(file: File, { signal, maxBytes = IMAGE_MAX_BYTES }: { signal?: AbortSignal; maxBytes?: number } = {}) {
  if (signal?.aborted) throw aborted();
  const limit = Math.min(maxBytes, IMAGE_MAX_BYTES);
  if (prepared.has(file) && file.size < limit) return file;
  if (pending >= 8) throw new ImageOptimizationError("Please wait for the current images to finish preparing.");
  pending++;
  const task = queue.then(async () => {
    if (signal?.aborted) throw aborted();
    const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const lowPower = (device.deviceMemory ?? 8) <= 4 || navigator.hardwareConcurrency <= 4 || device.connection?.saveData;
    const result = await workerImage(file, { maxBytes: limit, maxEdge: lowPower ? 1600 : IMAGE_MAX_EDGE }, signal);
    if (signal?.aborted) throw aborted();
    if (result.blob.type !== "image/webp" || result.blob.size >= limit) throw new ImageOptimizationError("The optimized image exceeds the upload limit.");
    const output = new File([result.blob], `${file.name.replace(/\.[^.]*$/, "").slice(0, 180) || "image"}.webp`, { type: "image/webp", lastModified: file.lastModified });
    prepared.add(output); return output;
  });
  queue = task.then(() => undefined, () => undefined);
  try { return await task; }
  catch (error) { if (error instanceof Error && error.name === "AbortError") throw error; throw error instanceof ImageOptimizationError ? error : new ImageOptimizationError(error instanceof Error ? error.message : "The image could not be prepared."); }
  finally { pending--; }
}

export async function prepareImageFormData(body: FormData, signal?: AbortSignal) {
  const result = new FormData();
  for (const [name, value] of body.entries()) result.append(name, isImageUpload(value) ? await optimizeImageFile(value, { signal }) : value);
  return result;
}
