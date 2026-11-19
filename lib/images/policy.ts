// Decimal bytes keep the saved file strictly below both 800 KB and 800 KiB.
export const IMAGE_MAX_BYTES = 800_000;
export const IMAGE_SOURCE_MAX_BYTES = 20 * 1024 * 1024;
export const IMAGE_MAX_EDGE = 2048;
export const IMAGE_MAX_PIXELS = 50_000_000;
export const IMAGE_MAX_PASSES = 6;

export function imageBounds(width: number, height: number, maxEdge: number) {
  const ratio = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

export function nextImagePass(width: number, height: number, quality: number, bytes: number, target: number) {
  if (quality > .6) return { width, height, quality: .56 };
  const ratio = Math.min(.82, Math.sqrt(target * .85 / bytes));
  return { width: Math.max(1, Math.floor(width * ratio)), height: Math.max(1, Math.floor(height * ratio)), quality: .78 };
}
