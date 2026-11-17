/** Decode only uncompressed WAV. Never copy LIST/ID3 or other source metadata into previews. */
export class MediaValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

export const PREVIEW_SECONDS = 30;
export const MAX_MASTER_BYTES = 60 * 1024 * 1024;

export function inspectWav(source: Buffer) {
  if (source.length > MAX_MASTER_BYTES) throw new MediaValidationError("WAV files must be at most 60 MB.", 413);
  if (source.length < 44 || source.toString("ascii", 0, 4) !== "RIFF" || source.toString("ascii", 8, 12) !== "WAVE") {
    throw new MediaValidationError("Upload an uncompressed PCM or float WAV file.");
  }
  const end = source.readUInt32LE(4) + 8;
  if (end > source.length) throw new MediaValidationError("The WAV file is incomplete.");
  let format: Buffer | undefined;
  let samples: Buffer | undefined;
  for (let offset = 12; offset + 8 <= end;) {
    const length = source.readUInt32LE(offset + 4);
    const next = offset + 8 + length;
    if (next > end) throw new MediaValidationError("The WAV file contains an invalid chunk.");
    const name = source.toString("ascii", offset, offset + 4);
    if (name === "fmt " && !format) format = source.subarray(offset + 8, next);
    if (name === "data" && !samples) samples = source.subarray(offset + 8, next);
    offset = next + (length % 2);
  }
  if (!format || format.length < 16 || !samples) throw new MediaValidationError("Missing WAV audio data.");
  const encoding = format.readUInt16LE(0);
  const channels = format.readUInt16LE(2);
  const sampleRate = format.readUInt32LE(4);
  const byteRate = format.readUInt32LE(8);
  const blockAlign = format.readUInt16LE(12);
  const bits = format.readUInt16LE(14);
  if (![1, 3].includes(encoding) || channels < 1 || channels > 8 || sampleRate < 8000 || sampleRate > 192000 ||
      ![8, 16, 24, 32].includes(bits) || (encoding === 3 && bits !== 32) ||
      blockAlign !== channels * bits / 8 || byteRate !== sampleRate * blockAlign || samples.length % blockAlign) {
    throw new MediaValidationError("Use PCM (8/16/24/32-bit) or 32-bit float WAV, up to 8 channels and 192 kHz.");
  }
  const frames = samples.length / blockAlign;
  const durationSeconds = frames / sampleRate;
  if (durationSeconds < PREVIEW_SECONDS || durationSeconds > 1800) throw new MediaValidationError("Tracks must be between 30 seconds and 30 minutes long.");
  return { format, samples, sampleRate, blockAlign, byteRate, durationSeconds, frames };
}

export function createWavPreview(source: Buffer, startSeconds: number) {
  const audio = inspectWav(source);
  if (!Number.isFinite(startSeconds) || startSeconds < 0 || startSeconds + PREVIEW_SECONDS > audio.durationSeconds + 0.000001) {
    throw new MediaValidationError("Select a complete 30-second section within the track.");
  }
  const start = Math.round(startSeconds * audio.sampleRate) * audio.blockAlign;
  const length = PREVIEW_SECONDS * audio.byteRate;
  const data = audio.samples.subarray(start, start + length);
  if (data.length !== length) throw new MediaValidationError("The selected section extends beyond the track.");
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + data.length, 4); header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16); audio.format.copy(header, 20, 0, 16);
  header.write("data", 36); header.writeUInt32LE(data.length, 40);
  return { preview: Buffer.concat([header, data]), durationSeconds: audio.durationSeconds };
}
