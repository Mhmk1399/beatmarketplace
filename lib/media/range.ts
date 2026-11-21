import { MediaValidationError } from "./wav";

/** One RFC 7233 byte range; multi-range responses are deliberately not supported. */
export function parseMediaRange(header: string | null, size: number) {
  if (header === null) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(size) || size <= 0) throw new MediaValidationError("Invalid byte range.", 416);
  const first = match[1] ? Number(match[1]) : null;
  const last = match[2] ? Number(match[2]) : null;
  if ((first !== null && !Number.isSafeInteger(first)) || (last !== null && !Number.isSafeInteger(last))) throw new MediaValidationError("Invalid byte range.", 416);
  const start = first === null ? Math.max(0, size - (last || 0)) : first;
  const end = first !== null && last !== null ? Math.min(last, size - 1) : size - 1;
  if (start < 0 || start >= size || end < start) throw new MediaValidationError("Invalid byte range.", 416);
  return { start, end };
}

