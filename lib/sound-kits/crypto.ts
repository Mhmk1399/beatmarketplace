import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
const MAGIC = Buffer.from("BMKIT1");
export function soundKitKey() {
  const encoded = process.env.SOUND_KIT_ENCRYPTION_KEY;
  if (!encoded)
    throw Object.assign(new Error("Sound kit encryption is not configured."), {
      status: 503,
    });
  if (!/^[A-Za-z0-9+/]{43}=$/.test(encoded))
    throw Object.assign(
      new Error("Sound kit encryption key must be 32 bytes encoded as base64."),
      { status: 503 },
    );
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32)
    throw Object.assign(
      new Error("Sound kit encryption key must be 32 bytes encoded as base64."),
      { status: 503 },
    );
  return key;
}
export function encryptSoundKit(plain: Buffer, key = soundKitKey()) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv),
    encrypted = Buffer.concat([cipher.update(plain), cipher.final()]),
    tag = cipher.getAuthTag();
  return Buffer.concat([MAGIC, iv, tag, encrypted]);
}
export function decryptSoundKit(payload: Buffer, key = soundKitKey()) {
  if (
    payload.length < MAGIC.length + 28 ||
    !payload.subarray(0, MAGIC.length).equals(MAGIC)
  )
    throw new Error("Invalid encrypted sound kit.");
  const iv = payload.subarray(6, 18),
    tag = payload.subarray(18, 34),
    data = payload.subarray(34),
    decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}
