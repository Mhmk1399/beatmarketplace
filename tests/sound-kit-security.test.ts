import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import {
  decryptSoundKit,
  encryptSoundKit,
  soundKitKey,
} from "../lib/sound-kits/crypto";
import {
  serializeSoundKitOrder,
  soundKitOrderAllowsDownload,
} from "../lib/sound-kits/orders";

test("sound kit encryption round trips and authenticates every byte", () => {
  const key = randomBytes(32),
    source = Buffer.from("PK\u0003\u0004 private kit bytes"),
    encrypted = encryptSoundKit(source, key);
  assert.deepEqual(decryptSoundKit(encrypted, key), source);
  encrypted[encrypted.length - 1] ^= 1;
  assert.throws(() => decryptSoundKit(encrypted, key));
});
test("sound kit deployment key fails closed", () => {
  const before = process.env.SOUND_KIT_ENCRYPTION_KEY;
  delete process.env.SOUND_KIT_ENCRYPTION_KEY;
  assert.throws(() => soundKitKey());
  process.env.SOUND_KIT_ENCRYPTION_KEY = "not-base64";
  assert.throws(() => soundKitKey());
  if (before === undefined) delete process.env.SOUND_KIT_ENCRYPTION_KEY;
  else process.env.SOUND_KIT_ENCRYPTION_KEY = before;
});
test("only paid live orders receive a download entitlement in production", (t) => {
  const before = process.env.NODE_ENV;
  Object.defineProperty(process.env, "NODE_ENV", {
    value: "production",
    configurable: true,
    writable: true,
    enumerable: true,
  });
  t.after(() => {
    if (before === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Reflect.set(process.env, "NODE_ENV", before);
  });
  assert.equal(
    soundKitOrderAllowsDownload({ status: "PAID", gatewayMode: "live" }),
    true,
  );
  assert.equal(
    soundKitOrderAllowsDownload({ status: "PENDING", gatewayMode: "live" }),
    false,
  );
  assert.equal(
    soundKitOrderAllowsDownload({ status: "PAID", gatewayMode: "sandbox" }),
    false,
  );
});
test("serialized orders never expose encrypted storage metadata", () => {
  const order = {
    _id: { toString: () => "order" },
    kitId: { toString: () => "kit" },
    title: "Kit",
    price: 1000,
    currency: "IRT" as const,
    status: "PENDING" as const,
    gatewayMode: "live" as const,
    assetName: "kit.zip",
    assetSizeBytes: 10,
    createdAt: new Date(),
    paidAt: undefined,
    referenceId: undefined,
    encryptedAsset: { key: "secret" },
  };
  const serialized = serializeSoundKitOrder(order as never);
  assert.equal("encryptedAsset" in serialized, false);
  assert.equal(JSON.stringify(serialized).includes("secret"), false);
});
