import { compressImage, decodeImage, type ImageOptions } from "./image-core";

self.onmessage = async (event: MessageEvent<{ file: File; options: ImageOptions }>) => {
  if (typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") {
    self.postMessage({ unsupported: true }); return;
  }
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await decodeImage(event.data.file, event.data.options);
    const canvas = new OffscreenCanvas(1, 1), context = canvas.getContext("2d");
    if (!context) { self.postMessage({ unsupported: true }); return; }
    const result = await compressImage(bitmap, bitmap.width, bitmap.height, {
      draw(source, width, height) { canvas.width = width; canvas.height = height; context.imageSmoothingQuality = "high"; context.drawImage(source, 0, 0, width, height); },
      encode: quality => canvas.convertToBlob({ type: "image/webp", quality }),
      dispose() { canvas.width = canvas.height = 1; },
    }, event.data.options);
    self.postMessage({ result });
  } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : "The image could not be prepared." }); }
  finally { bitmap?.close(); }
};
