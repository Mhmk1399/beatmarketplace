import { createReadStream, createWriteStream } from "node:fs";
import { open, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { MAX_MASTER_BYTES, MediaValidationError, PREVIEW_SECONDS } from "./wav";

/** Inspect headers with fixed-size reads. The complete master is never read into RAM. */
export async function inspectWavFile(filePath: string) {
  const details = await stat(/* turbopackIgnore: true */ filePath);
  if (details.size > MAX_MASTER_BYTES) throw new MediaValidationError("WAV files must be at most 60 MB.", 413);
  if (details.size < 44) throw new MediaValidationError("Upload an uncompressed PCM or float WAV file.");
  const file = await open(/* turbopackIgnore: true */ filePath, "r");
  async function read(size: number, position: number) {
    const data = Buffer.alloc(size);
    const result = await file.read(data, 0, size, position);
    if (result.bytesRead !== size) throw new MediaValidationError("The WAV file is incomplete.");
    return data;
  }
  try {
    const header = await read(12, 0);
    if (header.toString("ascii", 0, 4) !== "RIFF" || header.toString("ascii", 8, 12) !== "WAVE") throw new MediaValidationError("Upload an uncompressed PCM or float WAV file.");
    const end = header.readUInt32LE(4) + 8;
    if (end > details.size) throw new MediaValidationError("The WAV file is incomplete.");
    let format: Buffer | undefined;
    let dataOffset = 0;
    let dataLength = 0;
    let chunks = 0;
    for (let offset = 12; offset + 8 <= end;) {
      if (++chunks > 4096) throw new MediaValidationError("The WAV file contains too many metadata chunks.");
      const chunk = await read(8, offset);
      const length = chunk.readUInt32LE(4);
      const next = offset + 8 + length;
      if (next > end) throw new MediaValidationError("The WAV file contains an invalid chunk.");
      const name = chunk.toString("ascii", 0, 4);
      if (name === "fmt " && !format) {
        if (length < 16) throw new MediaValidationError("Missing WAV audio format.");
        format = await read(16, offset + 8);
      }
      if (name === "data" && !dataOffset) { dataOffset = offset + 8; dataLength = length; }
      offset = next + length % 2;
    }
    if (!format || !dataOffset) throw new MediaValidationError("Missing WAV audio data.");
    const encoding = format.readUInt16LE(0), channels = format.readUInt16LE(2), sampleRate = format.readUInt32LE(4);
    const byteRate = format.readUInt32LE(8), blockAlign = format.readUInt16LE(12), bits = format.readUInt16LE(14);
    if (![1, 3].includes(encoding) || channels < 1 || channels > 8 || sampleRate < 8000 || sampleRate > 192000 || ![8, 16, 24, 32].includes(bits) ||
        (encoding === 3 && bits !== 32) || blockAlign !== channels * bits / 8 || byteRate !== sampleRate * blockAlign || dataLength % blockAlign) {
      throw new MediaValidationError("Use PCM (8/16/24/32-bit) or 32-bit float WAV, up to 8 channels and 192 kHz.");
    }
    const durationSeconds = dataLength / byteRate;
    if (durationSeconds < PREVIEW_SECONDS || durationSeconds > 1800) throw new MediaValidationError("Tracks must be between 30 seconds and 30 minutes long.");
    return { format, dataOffset, dataLength, byteRate, sampleRate, blockAlign, durationSeconds, sizeBytes: details.size };
  } finally { await file.close(); }
}

export async function createWavPreviewFile(sourcePath: string, outputPath: string, startSeconds: number) {
  const audio = await inspectWavFile(sourcePath);
  if (!Number.isFinite(startSeconds) || startSeconds < 0 || startSeconds + PREVIEW_SECONDS > audio.durationSeconds + 0.000001) {
    throw new MediaValidationError("Select a complete 30-second section within the track.");
  }
  const start = Math.round(startSeconds * audio.sampleRate) * audio.blockAlign;
  const size = PREVIEW_SECONDS * audio.byteRate;
  if (start + size > audio.dataLength) throw new MediaValidationError("The selected section extends beyond the track.");
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + size, 4); header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16); audio.format.copy(header, 20);
  header.write("data", 36); header.writeUInt32LE(size, 40);
  const output = await open(/* turbopackIgnore: true */ outputPath, "wx", 0o600);
  try {
    await output.write(header);
    await pipeline(createReadStream(/* turbopackIgnore: true */ sourcePath, { start: audio.dataOffset + start, end: audio.dataOffset + start + size - 1, highWaterMark: 64 * 1024 }),
      createWriteStream(/* turbopackIgnore: true */ outputPath, { fd: output.fd, autoClose: false, start: 44 }));
  } finally { await output.close(); }
  return { durationSeconds: audio.durationSeconds, sizeBytes: 44 + size };
}
