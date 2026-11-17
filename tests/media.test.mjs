import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScript } from "./load-typescript.mjs";

const { createWavPreview, inspectWav, MediaValidationError, MAX_MASTER_BYTES } = loadTypeScript(new URL("../lib/media/wav.ts", import.meta.url));

function chunk(name, bytes) {
  const header = Buffer.alloc(8);
  header.write(name, 0);
  header.writeUInt32LE(bytes.length, 4);
  return Buffer.concat([header, bytes, ...(bytes.length % 2 ? [Buffer.alloc(1)] : [])]);
}

function wav({ seconds = 45, sampleRate = 8000, channels = 2, bits = 16, encoding = 1, metadata = false } = {}) {
  const blockAlign = channels * bits / 8;
  const frames = Math.round(seconds * sampleRate);
  const samples = Buffer.alloc(frames * blockAlign);
  // Nonrepeating frame/channel values ensure an incorrect starting point cannot pass by matching silence.
  for (let index = 0; index < samples.length; index++) samples[index] = (Math.floor(index / blockAlign) * 13 + index % blockAlign * 19) % 251;
  const format = Buffer.alloc(16);
  format.writeUInt16LE(encoding, 0); format.writeUInt16LE(channels, 2); format.writeUInt32LE(sampleRate, 4);
  format.writeUInt32LE(sampleRate * blockAlign, 8); format.writeUInt16LE(blockAlign, 12); format.writeUInt16LE(bits, 14);
  const chunks = [chunk("fmt ", format)];
  if (metadata) chunks.push(chunk("LIST", Buffer.from("PRIVATE_MASTER_METADATA_DO_NOT_PUBLISH")), chunk("JUNK", Buffer.from("odd")), chunk("id3 ", Buffer.from("PRIVATE_ID3_TAG")));
  chunks.push(chunk("data", samples));
  const payload = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.write("RIFF", 0); header.writeUInt32LE(payload.length + 4, 4); header.write("WAVE", 8);
  return { source: Buffer.concat([header, payload]), samples, sampleRate, blockAlign };
}

const assertMediaError = (operation, expectedStatus = 400) => assert.throws(operation, (error) => error instanceof MediaValidationError && error.status === expectedStatus);

test("preview contains exactly 30 seconds of frames at the producer-selected offset", () => {
  const input = wav();
  const { preview, durationSeconds } = createWavPreview(input.source, 7.125);
  const decoded = inspectWav(preview);
  assert.equal(durationSeconds, 45);
  assert.equal(decoded.durationSeconds, 30);
  assert.equal(preview.length, 44 + 30 * input.sampleRate * input.blockAlign);
  assert.deepEqual(decoded.samples, input.samples.subarray(7.125 * input.sampleRate * input.blockAlign, 37.125 * input.sampleRate * input.blockAlign));
  assert.equal(preview.readUInt32LE(4) + 8, preview.length);
});

test("fractional offsets round to whole audio frames and the final valid section is accepted", () => {
  const input = wav();
  const offset = 2.00007;
  const { preview } = createWavPreview(input.source, offset);
  const expectedStart = Math.round(offset * input.sampleRate) * input.blockAlign;
  assert.deepEqual(inspectWav(preview).samples, input.samples.subarray(expectedStart, expectedStart + 30 * input.sampleRate * input.blockAlign));
  assert.deepEqual(inspectWav(createWavPreview(input.source, 15).preview).samples, input.samples.subarray(15 * input.sampleRate * input.blockAlign));
});

test("negative, nonfinite and out-of-range preview selections are rejected", () => {
  const { source } = wav();
  for (const invalid of [-1, NaN, Infinity, 15.001, 45, 100_000]) assertMediaError(() => createWavPreview(source, invalid));
});

test("masters shorter than 30 seconds are rejected rather than exposed as complete previews", () => {
  assertMediaError(() => createWavPreview(wav({ seconds: 29.999 }).source, 0));
  const minimum = createWavPreview(wav({ seconds: 30 }).source, 0);
  assert.equal(inspectWav(minimum.preview).durationSeconds, 30);
});

test("private source metadata, ancillary chunks and bytes outside RIFF never enter the preview", () => {
  const input = wav({ metadata: true });
  const source = Buffer.concat([input.source, Buffer.from("PRIVATE_TRAILING_DATA")]);
  const { preview } = createWavPreview(source, 0);
  assert.equal(preview.toString("ascii", 12, 16), "fmt ");
  assert.equal(preview.toString("ascii", 36, 40), "data");
  for (const secret of ["PRIVATE_MASTER_METADATA_DO_NOT_PUBLISH", "PRIVATE_ID3_TAG", "PRIVATE_TRAILING_DATA"]) assert.equal(preview.includes(Buffer.from(secret)), false);
  assert.deepEqual(inspectWav(preview).samples, input.samples.subarray(0, 30 * input.sampleRate * input.blockAlign));
});

test("malformed RIFF headers and truncated audio chunks fail validation", () => {
  const { source } = wav();
  assertMediaError(() => inspectWav(Buffer.alloc(10)));
  const badContainer = Buffer.from(source); badContainer.write("MP3!", 0);
  assertMediaError(() => inspectWav(badContainer));
  const badWave = Buffer.from(source); badWave.write("AVI ", 8);
  assertMediaError(() => inspectWav(badWave));
  assertMediaError(() => inspectWav(source.subarray(0, source.length - 1)));
  const oversizedChunk = Buffer.from(source); oversizedChunk.writeUInt32LE(source.length, 40);
  assertMediaError(() => inspectWav(oversizedChunk));
  const missingFormat = Buffer.from(source); missingFormat.write("JUNK", 12);
  assertMediaError(() => inspectWav(missingFormat));
});

test("compressed codecs, inconsistent frame layouts and mismatched byte rates are rejected", () => {
  assertMediaError(() => inspectWav(wav({ encoding: 6 }).source));
  assertMediaError(() => inspectWav(wav({ encoding: 3, bits: 16 }).source));
  const { source } = wav();
  const badBlock = Buffer.from(source); badBlock.writeUInt16LE(1, 32);
  assertMediaError(() => inspectWav(badBlock));
  const badRate = Buffer.from(source); badRate.writeUInt32LE(1, 28);
  assertMediaError(() => inspectWav(badRate));
  const badFrames = Buffer.concat([source, Buffer.alloc(1)]); badFrames.writeUInt32LE(badFrames.length - 8, 4); badFrames.writeUInt32LE(source.readUInt32LE(40) + 1, 40);
  assertMediaError(() => inspectWav(badFrames));
});

test("supported PCM formats and IEEE float retain their format and exact preview length", () => {
  for (const format of [{ bits: 8, channels: 1 }, { bits: 24, channels: 2 }, { bits: 32, channels: 2 }, { bits: 32, channels: 2, encoding: 3 }]) {
    const input = wav({ ...format, seconds: 31 });
    const { preview } = createWavPreview(input.source, 1);
    assert.equal(inspectWav(preview).durationSeconds, 30);
    assert.deepEqual(preview.subarray(20, 36), input.source.subarray(20, 36));
  }
});

test("oversized files fail before any WAV chunk processing", () => {
  assertMediaError(() => inspectWav(Buffer.alloc(MAX_MASTER_BYTES + 1)), 413);
});
