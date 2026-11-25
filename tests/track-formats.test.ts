import assert from "node:assert/strict";
import test from "node:test";
import { isStructurallyValidZip } from "../lib/media/paid-assets";
import { trackSupportsFormats } from "../lib/marketplace/server";
import { serializeOrder } from "../lib/payments/orders";

test("delivery readiness matches every promised format and preserves legacy WAV", () => {
  assert.equal(trackSupportsFormats(undefined, ["WAV"]), true);
  assert.equal(trackSupportsFormats(undefined, ["MP3"]), false);
  assert.equal(
    trackSupportsFormats({ wav: true, mp3: true, stems: false }, [
      "WAV",
      "MP3",
    ]),
    true,
  );
  assert.equal(
    trackSupportsFormats({ wav: true, mp3: true, stems: false }, ["STEMS"]),
    false,
  );
});
test("stems validation requires a complete bounded ZIP directory", () => {
  assert.equal(
    isStructurallyValidZip(Buffer.from("PK\u0003\u0004fake")),
    false,
  );
  const emptyZip = Buffer.alloc(22);
  emptyZip.writeUInt32LE(0x06054b50, 0);
  assert.equal(isStructurallyValidZip(emptyZip), false);
});
test("order serialization exposes entitled format links without storage metadata", () => {
  const asset = {
    provider: "OTHER",
    bucket: "public",
    key: "secret.full-mp3.enc",
    mimeType: "application/octet-stream",
    originalFileName: "beat.mp3",
    sizeBytes: 20,
    uploadedAt: new Date(),
  } as const;
  const order = {
    _id: { toString: () => "order" },
    buyerId: {},
    idempotencyKey: "key",
    total: 1000,
    currency: "IRT" as const,
    status: "PAID" as const,
    gatewayMode: "live" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        trackId: {},
        producerId: {},
        title: "Beat",
        contractId: {},
        contractVersion: 1,
        licenseTitle: "MP3",
        price: 1000,
        terms: "{}",
        deliverables: [{ format: "MP3" as const, asset, name: "beat.mp3" }],
      },
    ],
  };
  const serialized = serializeOrder(order as never);
  const text = JSON.stringify(serialized);
  assert.equal(serialized.items[0].downloads[0].format, "MP3");
  assert.equal(text.includes(asset.key), false);
  assert.equal(text.includes(asset.bucket), false);
});
