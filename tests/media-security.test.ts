import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";
import ffmpegPath from "ffmpeg-static";
import { storeTrackMedia } from "../lib/media/storage";
import { serveStoredAsset } from "../lib/media/delivery";
import { previewUrl } from "../lib/media/policy";
import { readSecureJson, requireSameOrigin } from "../lib/security/request";
import { getAccessToken } from "../lib/auth";
import { previewCdnUrl } from "../lib/media/preview-cdn";
import { Readable } from "node:stream";
import { mediaS3Client } from "../lib/media/adapter";
import type { ObjectStorageAsset } from "../models/schemas/shared";
import { decryptSoundKit } from "../lib/sound-kits/crypto";

test("upload preserves the original and exposes only a compressed, cropped preview", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "beat-security-test-"),
  );
  const oldDriver = process.env.MEDIA_STORAGE_DRIVER,
    oldRoot = process.env.MEDIA_STORAGE_DIR,
    oldKey = process.env.SOUND_KIT_ENCRYPTION_KEY;
  process.env.MEDIA_STORAGE_DRIVER = "local";
  process.env.MEDIA_STORAGE_DIR = path.join(directory, "private");
  process.env.SOUND_KIT_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  try {
    // Distinct tones before, inside and after the selected section detect an incorrect crop.
    const rate = 44100,
      frames = 60 * rate,
      size = frames * 4;
    const source = Buffer.alloc(44 + size);
    source.write("RIFF", 0);
    source.writeUInt32LE(36 + size, 4);
    source.write("WAVEfmt ", 8);
    source.writeUInt32LE(16, 16);
    source.writeUInt16LE(1, 20);
    source.writeUInt16LE(2, 22);
    source.writeUInt32LE(rate, 24);
    source.writeUInt32LE(rate * 4, 28);
    source.writeUInt16LE(4, 32);
    source.writeUInt16LE(16, 34);
    source.write("data", 36);
    source.writeUInt32LE(size, 40);
    for (let frame = 0; frame < frames; frame++) {
      const second = frame / rate,
        hz = second < 15 ? 300 : second < 45 ? 700 : 1100;
      const sample = Math.round(16000 * Math.sin(2 * Math.PI * hz * second));
      source.writeInt16LE(sample, 44 + frame * 4);
      source.writeInt16LE(sample, 46 + frame * 4);
    }
    const sourcePath = path.join(directory, "original.wav");
    await writeFile(sourcePath, source);
    const stages: string[] = [];
    const upload = {
      path: sourcePath,
      name: "original.wav",
      type: "audio/wav",
      size: source.length,
    };
    const media = await storeTrackMedia({
      master: upload,
      previewStartSeconds: 15,
      onProgress: (stage) => stages.push(stage),
    });
    assert.deepEqual(stages, ["validating", "previewing", "storing"]);
    assert.ok(media.master);
    assert.equal(media.master.publicUrl, undefined);
    const masterPath = path.join(
      process.env.MEDIA_STORAGE_DIR,
      media.master.storageKey!,
    );
    const hash = (bytes: Buffer) =>
      createHash("sha256").update(bytes).digest("hex");
    const encryptedMaster = await readFile(masterPath);
    assert.notEqual(hash(encryptedMaster), hash(source));
    assert.equal(hash(decryptSoundKit(encryptedMaster)), hash(source));
    assert.match(media.preview.key, /\.preview\.mp3$/);
    assert.equal(media.preview.mimeType, "audio/mpeg");
    assert.equal(media.preview.durationSeconds, 30);
    assert.ok(media.preview.sizeBytes < 600_000);
    assert.equal(previewUrl(media.master), null);
    assert.equal(
      previewUrl({
        ...media.preview,
        key: media.master.key,
        publicUrl: "/fake-preview.mp3",
      }),
      null,
    );
    const previewPath = path.join(
      process.env.MEDIA_STORAGE_DIR,
      media.preview.storageKey!,
    );
    const decoded = path.join(directory, "decoded.pcm");
    await promisify(execFile)(process.env.FFMPEG_PATH || ffmpegPath!, [
      "-nostdin",
      "-loglevel",
      "error",
      "-i",
      previewPath,
      "-f",
      "s16le",
      "-acodec",
      "pcm_s16le",
      decoded,
    ]);
    const pcm = await readFile(decoded);
    assert.ok(
      Math.abs(pcm.length / (rate * 4) - 30) < 0.05,
      "decoded preview must contain only 30 seconds",
    );
    let crossings = 0;
    for (let i = rate; i < 2 * rate; i++)
      if (pcm.readInt16LE(i * 4) >= 0 && pcm.readInt16LE((i - 1) * 4) < 0)
        crossings++;
    assert.ok(
      Math.abs(crossings - 700) < 5,
      "preview must contain the chosen section",
    );
    await assert.rejects(
      serveStoredAsset(new Request("http://localhost/master"), media.master),
      /could not be found/,
    );
    const partial = await serveStoredAsset(
      new Request("http://localhost/preview", {
        headers: { Range: "bytes=1024-2047" },
      }),
      media.preview,
    );
    assert.equal(partial.status, 206);
    assert.equal((await partial.arrayBuffer()).byteLength, 1024);
    assert.equal(
      partial.headers.get("content-range"),
      `bytes 1024-2047/${media.preview.sizeBytes}`,
    );
    assert.equal(partial.headers.get("cache-control"), "private, no-cache");
    const unchanged = await serveStoredAsset(
      new Request("http://localhost/preview", {
        headers: { "If-None-Match": partial.headers.get("etag")! },
      }),
      media.preview,
    );
    assert.equal(unchanged.status, 304);
    const low = await serveStoredAsset(
      new Request("http://localhost/preview?quality=low"),
      media.preview,
    );
    assert.equal(low.headers.get("x-audio-quality"), "96");
    const lowBytes = Buffer.from(await low.arrayBuffer());
    assert.ok(
      lowBytes.length < media.preview.sizeBytes * 0.8,
      "data-saver copy should use fewer bytes",
    );
    assert.notEqual(low.headers.get("etag"), partial.headers.get("etag"));
    const otherRepresentation = await serveStoredAsset(
      new Request("http://localhost/preview", {
        headers: { Range: "bytes=1-10", "If-Range": low.headers.get("etag")! },
      }),
      media.preview,
    );
    assert.equal(
      otherRepresentation.status,
      200,
      "a different quality cannot reuse a byte range",
    );
    await otherRepresentation.arrayBuffer();
    await assert.rejects(
      serveStoredAsset(
        new Request("http://localhost/preview?quality=invalid"),
        media.preview,
      ),
      /Unknown audio quality/,
    );
    const invalid = await serveStoredAsset(
      new Request("http://localhost/preview", {
        headers: { Range: "bytes=99999999-" },
      }),
      media.preview,
    );
    assert.equal(invalid.status, 416);
    await assert.rejects(
      serveStoredAsset(
        new Request("http://localhost/download", { method: "HEAD" }),
        media.master,
        { downloadName: "Purchased track", privateDownload: true },
      ),
      /Purchased file not found/,
    );
    assert.equal((await stat(masterPath)).size, source.length + 34);
    const existingFiles = (
      await readdir(process.env.MEDIA_STORAGE_DIR, { recursive: true })
    ).sort();
    const encoder = process.env.FFMPEG_PATH;
    const failedStages: string[] = [];
    try {
      process.env.FFMPEG_PATH = path.join(directory, "missing-encoder");
      await assert.rejects(
        storeTrackMedia({
          master: upload,
          previewStartSeconds: 15,
          onProgress: (stage) => failedStages.push(stage),
        }),
        /Audio preparation failed/,
      );
      assert.deepEqual(failedStages, ["validating", "previewing"]);
      assert.deepEqual(
        (
          await readdir(process.env.MEDIA_STORAGE_DIR, { recursive: true })
        ).sort(),
        existingFiles,
      );
      assert.equal(
        hash(await readFile(sourcePath)),
        hash(source),
        "failed preparation must preserve the selected source",
      );
    } finally {
      if (encoder === undefined) delete process.env.FFMPEG_PATH;
      else process.env.FFMPEG_PATH = encoder;
    }
  } finally {
    if (oldDriver === undefined) delete process.env.MEDIA_STORAGE_DRIVER;
    else process.env.MEDIA_STORAGE_DRIVER = oldDriver;
    if (oldRoot === undefined) delete process.env.MEDIA_STORAGE_DIR;
    else process.env.MEDIA_STORAGE_DIR = oldRoot;
    if (oldKey === undefined) delete process.env.SOUND_KIT_ENCRYPTION_KEY;
    else process.env.SOUND_KIT_ENCRYPTION_KEY = oldKey;
    await rm(directory, { recursive: true, force: true });
  }
});

test("cross-site mutations, malformed cookies, and oversized JSON are handled safely", async () => {
  assert.throws(
    () =>
      requireSameOrigin(
        new Request("http://localhost/api/orders", {
          headers: { Origin: "https://other.example" },
        }),
      ),
    /this website/,
  );
  assert.throws(
    () =>
      requireSameOrigin(
        new Request("http://localhost/api/orders", {
          headers: { "Sec-Fetch-Site": "cross-site" },
        }),
      ),
    /this website/,
  );
  assert.doesNotThrow(() =>
    requireSameOrigin(
      new Request("http://localhost/api/orders", {
        headers: { Origin: "http://localhost" },
      }),
    ),
  );
  assert.doesNotThrow(() =>
    requireSameOrigin(
      new Request("http://localhost/api/orders", {
        headers: { Host: "127.0.0.1:4321", Origin: "http://127.0.0.1:4321" },
      }),
    ),
  );
  assert.doesNotThrow(() =>
    requireSameOrigin(
      new Request("http://localhost/api/orders", {
        headers: {
          Host: "internal:3000",
          "X-Forwarded-Host": "beats.example",
          "X-Forwarded-Proto": "https",
          Origin: "https://beats.example",
        },
      }),
    ),
  );
  assert.throws(
    () =>
      requireSameOrigin(
        new Request("http://localhost/api/orders", {
          headers: { Host: "beats.example", Origin: "https://evil.example" },
        }),
      ),
    /this website/,
  );
  assert.equal(
    getAccessToken(
      new Request("http://localhost", {
        headers: { Cookie: "beatmarketplace_access=%ZZ" },
      }),
    ),
    null,
  );
  await assert.rejects(
    readSecureJson(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: "a".repeat(20_000) }),
      }),
    ),
    /too large/,
  );
  await assert.rejects(
    readSecureJson(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
    ),
    /Invalid JSON/,
  );
});

test("purchased S3 downloads never redirect, even when previews use redirects", async () => {
  const names = [
    "MEDIA_S3_BUCKET",
    "MEDIA_S3_ACCESS_KEY_ID",
    "MEDIA_S3_SECRET_ACCESS_KEY",
    "MEDIA_S3_DELIVERY_MODE",
  ] as const;
  const previous = names.map((name) => process.env[name]);
  process.env.MEDIA_S3_BUCKET = "qa-private";
  process.env.MEDIA_S3_ACCESS_KEY_ID = "qa-key";
  process.env.MEDIA_S3_SECRET_ACCESS_KEY = "qa-secret";
  process.env.MEDIA_S3_DELIVERY_MODE = "redirect";
  const client = mediaS3Client(),
    originalSend = client.send;
  const bytes = Buffer.from("private original bytes");
  // Stub the object transport, while exercising the actual delivery and response code.
  Object.defineProperty(client, "send", {
    configurable: true,
    value: async () => ({
      Body: Readable.from([bytes]),
      ContentLength: bytes.length,
    }),
  });
  const asset: ObjectStorageAsset = {
    provider: "S3",
    bucket: "qa-private",
    key: "00000000-0000-4000-8000-000000000001.master.wav",
    mimeType: "audio/wav",
    originalFileName: "original.wav",
    sizeBytes: bytes.length,
    uploadedAt: new Date(),
  };
  try {
    const response = await serveStoredAsset(
      new Request("http://localhost/download"),
      asset,
      { downloadName: "Original", privateDownload: true },
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  } finally {
    Object.defineProperty(client, "send", {
      configurable: true,
      value: originalSend,
    });
    names.forEach((name, index) => {
      if (previous[index] === undefined) delete process.env[name];
      else process.env[name] = previous[index];
    });
  }
});

test("optional CDN URLs can contain preview assets but never masters", () => {
  const delivery = process.env.MEDIA_PREVIEW_DELIVERY,
    base = process.env.MEDIA_PREVIEW_CDN_BASE_URL;
  process.env.MEDIA_PREVIEW_DELIVERY = "cdn";
  process.env.MEDIA_PREVIEW_CDN_BASE_URL = "https://audio.example.test/";
  const preview: ObjectStorageAsset = {
    provider: "S3",
    bucket: "qa",
    key: "00000000-0000-4000-8000-000000000002.preview.mp3",
    storageKey:
      "beatmarket/a/b/00000000-0000-4000-8000-000000000002.preview.mp3",
    mimeType: "audio/mpeg",
    originalFileName: "preview.mp3",
    sizeBytes: 100,
    durationSeconds: 30,
    uploadedAt: new Date(),
  };
  try {
    assert.equal(
      previewCdnUrl(preview),
      `https://audio.example.test/${preview.storageKey}`,
    );
    assert.equal(
      previewCdnUrl({
        ...preview,
        key: preview.key.replace(".preview.mp3", ".master.wav"),
        mimeType: "audio/wav",
      }),
      null,
    );
    assert.throws(
      () => previewCdnUrl({ ...preview, storageKey: `../${preview.key}` }),
      /Invalid preview location/,
    );
  } finally {
    if (delivery === undefined) delete process.env.MEDIA_PREVIEW_DELIVERY;
    else process.env.MEDIA_PREVIEW_DELIVERY = delivery;
    if (base === undefined) delete process.env.MEDIA_PREVIEW_CDN_BASE_URL;
    else process.env.MEDIA_PREVIEW_CDN_BASE_URL = base;
  }
});
