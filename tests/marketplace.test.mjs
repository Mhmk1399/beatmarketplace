import assert from "node:assert/strict";
import test from "node:test";

import { loadTypeScript } from "./load-typescript.mjs";

const { contractInputSchema, contractPatchSchema, taxonomyPatchSchema, tomanPriceSchema, trackInputSchema, trackPatchSchema, trackQuerySchema } = loadTypeScript(new URL("../lib/marketplace/validation.ts", import.meta.url));

const validTrack = { title: "Night Drive", bpm: 140, musicalKey: "F minor" };
const validContract = { title: "WAV license", price: "150000", trackIds: ["0123456789abcdef01234567"] };

test("partial track edits retain omitted publication, preview, metadata, and visibility fields", () => {
  assert.deepEqual(trackPatchSchema.parse({ title: "Renamed" }), { title: "Renamed" });
  assert.deepEqual(trackPatchSchema.parse({ description: "" }), { description: "" });
  assert.deepEqual(trackPatchSchema.parse({ genreId: null }), { genreId: null });
});

test("partial license edits do not silently reset exclusivity or terms", () => {
  assert.deepEqual(contractPatchSchema.parse({ title: "Renamed" }), { title: "Renamed" });
  assert.deepEqual(contractPatchSchema.parse({ streamingLimit: null }), { streamingLimit: null });
});

test("renaming an inactive taxonomy item does not reactivate it", () => {
  assert.deepEqual(taxonomyPatchSchema.parse({ kind: "genres", name: "Hip Hop" }), { kind: "genres", name: "Hip Hop" });
});

test("toman prices use whole bounded values, never floating point or client currency conversion", () => {
  assert.equal(tomanPriceSchema.parse("001000"), "1000");
  assert.equal(tomanPriceSchema.parse("1000000000"), "1000000000");
  for (const invalid of ["0", "999", "1000000001", "1.5", "1e6", "NaN", "Infinity", "-1000", "1000.00"]) {
    assert.equal(tomanPriceSchema.safeParse(invalid).success, false, invalid);
  }
  assert.equal(contractInputSchema.parse(validContract).currency, "IRT");
  assert.equal(contractInputSchema.safeParse({ ...validContract, currency: "USD" }).success, false);
});

test("licenses cannot advertise absent MP3 or stems deliverables and cannot repeat tracks", () => {
  assert.deepEqual(contractInputSchema.parse(validContract).formats, ["WAV"]);
  assert.equal(contractInputSchema.safeParse({ ...validContract, formats: ["MP3"] }).success, false);
  assert.equal(contractInputSchema.safeParse({ ...validContract, trackIds: [...validContract.trackIds, ...validContract.trackIds] }).success, false);
});

test("track input rejects owner, storage and preview duration injection", () => {
  const track = trackInputSchema.parse(validTrack);
  assert.equal(track.visibility, "PRIVATE");
  assert.equal(track.status, "DRAFT");
  for (const extra of [{ producerId: "0123456789abcdef01234567" }, { audio: { master: { publicUrl: "https://example.com" } } }, { previewDurationSeconds: 300 }]) {
    assert.equal(trackInputSchema.safeParse({ ...validTrack, ...extra }).success, false);
  }
  assert.equal(trackInputSchema.safeParse({ ...validTrack, previewStartSeconds: -1 }).success, false);
  assert.equal(trackInputSchema.safeParse({ ...validTrack, previewStartSeconds: Infinity }).success, false);
});

test("catalog filters enforce valid BPM ranges and bounded pagination", () => {
  assert.equal(trackQuerySchema.safeParse({ minBpm: "160", maxBpm: "80" }).success, false);
  assert.equal(trackQuerySchema.safeParse({ pageSize: "5000" }).success, false);
  assert.equal(trackQuerySchema.safeParse({ page: "0" }).success, false);
  assert.equal(trackQuerySchema.safeParse({ genreId: "{$ne:null}" }).success, false);
  assert.equal(trackQuerySchema.parse({ minBpm: "80", maxBpm: "160", pageSize: "48" }).pageSize, 48);
});
