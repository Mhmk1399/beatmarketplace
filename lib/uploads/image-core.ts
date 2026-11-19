import { IMAGE_MAX_PASSES, IMAGE_MAX_PIXELS, IMAGE_SOURCE_MAX_BYTES, imageBounds, nextImagePass } from "@/lib/images/policy";

export type ImageOptions = { maxBytes: number; maxEdge: number };
export type ImageResult = { blob: Blob; width: number; height: number };
export type ImageRenderer = {
  draw: (source: CanvasImageSource, width: number, height: number) => void;
  encode: (quality: number) => Promise<Blob>;
  dispose: () => void;
};

function exifOrientation(data: DataView, start: number, end: number) {
  try {
    const little = data.getUint16(start) === 0x4949;
    if (!little && data.getUint16(start) !== 0x4d4d) return 1;
    const ifd = start + data.getUint32(start + 4, little);
    if (ifd + 2 > end) return 1;
    const count = Math.min(data.getUint16(ifd, little), 256);
    for (let index = 0; index < count; index++) {
      const offset = ifd + 2 + index * 12;
      if (offset + 12 > end) break;
      if (data.getUint16(offset, little) === 0x112) return data.getUint16(offset + 8, little);
    }
  } catch { /* Missing/malformed optional EXIF does not replace format validation. */ }
  return 1;
}

/** Read only a bounded header before asking the browser to decode large pixels. */
export async function inspectImage(file: File) {
  if (!file.size || file.size > IMAGE_SOURCE_MAX_BYTES) throw new Error("Choose a non-empty image of 20 MB or smaller.");
  const bytes = new Uint8Array(await file.slice(0, 1024 * 1024).arrayBuffer()), data = new DataView(bytes.buffer);
  let width = 0, height = 0, orientation = 1;
  const ascii = (offset: number, length: number) => String.fromCharCode(...bytes.subarray(offset, offset + length));
  if (bytes.length >= 24 && ascii(1, 3) === "PNG" && data.getUint32(0) === 0x89504e47) {
    width = data.getUint32(16); height = data.getUint32(20);
  } else if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") {
    for (let offset = 12; offset + 8 < bytes.length;) {
      const tag = ascii(offset, 4), size = data.getUint32(offset + 4, true), payload = offset + 8;
      if (tag === "VP8X" && payload + 10 <= bytes.length) {
        width = 1 + bytes[payload + 4] + (bytes[payload + 5] << 8) + (bytes[payload + 6] << 16);
        height = 1 + bytes[payload + 7] + (bytes[payload + 8] << 8) + (bytes[payload + 9] << 16);
      } else if (tag === "VP8L" && payload + 5 <= bytes.length) {
        const bits = data.getUint32(payload + 1, true); width = (bits & 0x3fff) + 1; height = ((bits >>> 14) & 0x3fff) + 1;
      } else if (tag === "VP8 " && payload + 10 <= bytes.length) {
        width = data.getUint16(payload + 6, true) & 0x3fff; height = data.getUint16(payload + 8, true) & 0x3fff;
      } else if (tag === "EXIF") orientation = exifOrientation(data, payload + (ascii(payload, 4) === "Exif" ? 6 : 0), Math.min(payload + size, bytes.length));
      offset = payload + size + (size % 2);
    }
  } else if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216) {
    for (let offset = 2; offset + 4 < bytes.length;) {
      if (bytes[offset++] !== 255) break;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 1 || (marker >= 0xd0 && marker <= 0xd8)) continue;
      if (offset + 2 > bytes.length) break;
      const size = data.getUint16(offset);
      if (size < 2 || offset + size > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && size >= 8) {
        height = data.getUint16(offset + 3); width = data.getUint16(offset + 5);
      } else if (marker === 0xe1 && ascii(offset + 2, 4) === "Exif") orientation = exifOrientation(data, offset + 8, offset + size);
      offset += size;
    }
  }
  if (!width || !height) throw new Error("This image could not be read. Choose a PNG, JPEG or WebP image.");
  if (width * height > IMAGE_MAX_PIXELS) throw new Error("Choose an image with at most 50 megapixels.");
  return orientation >= 5 && orientation <= 8 ? { width: height, height: width } : { width, height };
}

export async function decodeImage(file: File, options: ImageOptions) {
  const size = await inspectImage(file);
  // A single resize axis preserves aspect ratio even when a decoder handles EXIF differently.
  const resize = size.width >= size.height ? { resizeWidth: Math.min(size.width, options.maxEdge) } : { resizeHeight: Math.min(size.height, options.maxEdge) };
  return createImageBitmap(file, { ...resize, imageOrientation: "from-image", resizeQuality: "high" });
}

export async function compressImage(source: CanvasImageSource, sourceWidth: number, sourceHeight: number, renderer: ImageRenderer, options: ImageOptions, cancelled: () => boolean = () => false, yieldControl: () => Promise<void> = () => Promise.resolve()): Promise<ImageResult> {
  let { width, height } = imageBounds(sourceWidth, sourceHeight, options.maxEdge), quality = .84;
  try {
    for (let pass = 0; pass < IMAGE_MAX_PASSES; pass++) {
      if (cancelled()) throw new DOMException("Image preparation cancelled.", "AbortError");
      await yieldControl(); renderer.draw(source, width, height);
      const blob = await renderer.encode(quality);
      if (blob.type !== "image/webp") throw new Error("WebP conversion is unavailable. Please use an updated browser.");
      if (blob.size > 0 && blob.size < options.maxBytes) return { blob, width, height };
      ({ width, height, quality } = nextImagePass(width, height, quality, blob.size, options.maxBytes));
    }
    throw new Error("This image could not be reduced below 800 KB. Choose a smaller image.");
  } finally { renderer.dispose(); }
}
