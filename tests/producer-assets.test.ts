import assert from "node:assert/strict";
import test from "node:test";
import { producerAssetDto } from "../lib/workspace/producer-assets";

test("producer file inventory omits every storage location and URL", () => {
  const dto = producerAssetDto("track", "Night Drive", "Master WAV", { provider: "S3", bucket: "public-bucket", key: "secret/master.wav", storageKey: "internal", publicUrl: "https://bucket/master.wav", mimeType: "audio/wav", originalFileName: "night-drive.wav", sizeBytes: 42, uploadedAt: new Date("2026-01-01T00:00:00.000Z") });
  assert.deepEqual(dto, { id: "track:Master WAV", trackId: "track", trackTitle: "Night Drive", role: "Master WAV", originalFileName: "night-drive.wav", mimeType: "audio/wav", sizeBytes: 42, uploadedAt: "2026-01-01T00:00:00.000Z" });
  assert.equal("key" in dto || "bucket" in dto || "publicUrl" in dto || "storageKey" in dto, false);
});
