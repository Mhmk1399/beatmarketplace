import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import test from "node:test";
import { loadTypeScript } from "./load-typescript.mjs";

const wav = loadTypeScript(new URL("../lib/media/wav.ts", import.meta.url));
const config = loadTypeScript(new URL("../lib/media/config.ts", import.meta.url), { "./wav": wav });
const wavFile = loadTypeScript(new URL("../lib/media/wav-file.ts", import.meta.url), { "./wav": wav });
const upload = loadTypeScript(new URL("../lib/media/upload.ts", import.meta.url), { "./wav": wav, "./config": config });

async function temporary(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "beat-storage-test-"));
  t.after(async () => {
    const absolute = path.resolve(directory);
    assert.equal(path.dirname(absolute), path.resolve(os.tmpdir()));
    assert.ok(path.basename(absolute).startsWith("beat-storage-test-"));
    await rm(absolute, { recursive: true, force: true });
  });
  return directory;
}

function env(t, values) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  t.after(() => { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
}

function sdkHarness() {
  const state = { commands: [], uploads: [], signings: [], objects: new Map(), clients: [] };
  class Command { constructor(input) { this.input = input; } }
  class GetObjectCommand extends Command {}
  class HeadObjectCommand extends Command {}
  class DeleteObjectCommand extends Command {}
  class S3Client {
    constructor(options) { state.clients.push(options); }
    async send(command) {
      state.commands.push(command);
      const bytes = state.objects.get(command.input.Key);
      if (command instanceof GetObjectCommand) return { Body: Readable.from([bytes || Buffer.from("object")]), ContentLength: (bytes || Buffer.from("object")).length };
      if (command instanceof HeadObjectCommand) return { ContentLength: bytes?.length || 12345 };
      if (command instanceof DeleteObjectCommand) state.objects.delete(command.input.Key);
      return {};
    }
    destroy() {}
  }
  class Upload {
    constructor(options) { this.options = options; state.uploads.push(options); }
    async done() { const chunks = []; for await (const chunk of this.options.params.Body) chunks.push(chunk); state.objects.set(this.options.params.Key, Buffer.concat(chunks)); }
  }
  const aws = { S3Client, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand };
  const adapter = loadTypeScript(new URL("../lib/media/adapter.ts", import.meta.url), { "./wav": wav, "./config": config, "@aws-sdk/client-s3": aws, "@aws-sdk/lib-storage": { Upload } });
  const delivery = loadTypeScript(new URL("../lib/media/delivery.ts", import.meta.url), {
    "./wav": wav, "./adapter": adapter, "@aws-sdk/client-s3": aws,
    "@aws-sdk/s3-request-presigner": { getSignedUrl: async (_client, command, options) => { state.signings.push({ command, options }); return "https://private-store.example/signed?expires=60"; } },
  });
  const storage = loadTypeScript(new URL("../lib/media/storage.ts", import.meta.url), { "./wav": wav, "./config": config, "./adapter": adapter, "./delivery": delivery, "./types": { isSpooledFile: (file) => typeof file.path === "string" }, "./wav-file": wavFile });
  return { state, adapter, delivery, storage };
}

const configureS3 = { NODE_ENV: "test", MEDIA_STORAGE_DRIVER: "s3", MEDIA_S3_PROVIDER: "R2", MEDIA_S3_BUCKET: "private-beats", MEDIA_S3_REGION: "auto",
  MEDIA_S3_ENDPOINT: "https://private-store.example", MEDIA_S3_ACCESS_KEY_ID: "test-key", MEDIA_S3_SECRET_ACCESS_KEY: "test-secret", MEDIA_S3_PREFIX: "media" };

function makeWav(seconds = 40) {
  const byteRate = 16000;
  const data = Buffer.alloc(seconds * byteRate);
  for (let index = 0; index < data.length; index++) data[index] = index % 253;
  const header = Buffer.alloc(44);
  header.write("RIFF"); header.writeUInt32LE(36 + data.length, 4); header.write("WAVEfmt ", 8); header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(8000, 24); header.writeUInt32LE(byteRate, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write("data", 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

test("file-based WAV cropping produces the exact same 30-second frames without loading the source wholesale", async (t) => {
  const directory = await temporary(t);
  const source = makeWav();
  const sourcePath = path.join(directory, "source.wav"), previewPath = path.join(directory, "preview.wav");
  await writeFile(sourcePath, source);
  const result = await wavFile.createWavPreviewFile(sourcePath, previewPath, 7);
  assert.equal(result.durationSeconds, 40);
  assert.equal(result.sizeBytes, 480044);
  assert.deepEqual(await readFile(previewPath), wav.createWavPreview(source, 7).preview);
  await assert.rejects(wavFile.createWavPreviewFile(sourcePath, path.join(directory, "bad.wav"), 11), /complete 30-second/);
});

test("file-based WAV inspection rejects unsupported, truncated and source-shortened streams", async (t) => {
  const directory = await temporary(t);
  for (const [name, bytes] of [["short", makeWav(29)], ["truncated", makeWav().subarray(0, 70)], ["codec", (() => { const file = makeWav(); file.writeUInt16LE(6, 20); return file; })()]]) {
    const target = path.join(directory, name); await writeFile(target, bytes);
    await assert.rejects(wavFile.inspectWavFile(target), (error) => error instanceof wav.MediaValidationError);
  }
});

test("multipart upload spools both files privately and cleanup removes only its temporary directory", async () => {
  const form = new FormData(); form.set("data", JSON.stringify({ title: "Track" }));
  form.set("master", new File(["audio bytes"], "../../source.wav", { type: "audio/wav" }));
  form.set("artwork", new File(["image bytes"], "art.png", { type: "image/png" }));
  const parsed = await upload.parseBoundedTrackForm(new Request("https://beats.example/api/tracks", { method: "POST", body: form }));
  assert.deepEqual(parsed.data, { title: "Track" });
  assert.equal(parsed.master.name, "source.wav");
  assert.equal(parsed.master.size, 11); assert.equal(await readFile(parsed.master.path, "utf8"), "audio bytes");
  assert.equal(path.dirname(parsed.master.path), path.dirname(parsed.artwork.path));
  await parsed.cleanup(); await parsed.cleanup();
  await assert.rejects(stat(parsed.master.path), { code: "ENOENT" });
});

test("multipart limits inspect actual streamed bytes even with a false Content-Length", async () => {
  const form = new FormData(); form.set("data", "{}");
  form.set("artwork", new File([Buffer.alloc(5 * 1024 * 1024 + 1)], "art.png"));
  const request = new Request("https://beats.example/api/tracks", { method: "POST", body: form });
  request.headers.set("content-length", "1");
  await assert.rejects(upload.parseBoundedTrackForm(request), (error) => error.status === 413);
});

test("multipart parser rejects duplicate fields, unexpected files, empty files and malformed data", async () => {
  for (const mode of ["duplicate", "unexpected", "empty", "json", "large-data"]) {
    const form = new FormData(); form.set("data", mode === "json" ? "bad" : mode === "large-data" ? "x".repeat(32001) : "{}");
    if (mode === "duplicate") form.append("data", "{}");
    if (mode === "unexpected") form.set("other", new File(["bytes"], "other.wav"));
    if (mode === "empty") form.set("master", new File([], "empty.wav"));
    await assert.rejects(upload.parseBoundedTrackForm(new Request("https://beats.example/api/tracks", { method: "POST", body: form })), (error) => error.status === 400);
  }
});

test("the raw request cap counts chunked multipart preambles and rejects already-cancelled uploads", async () => {
  const chunk = Buffer.alloc(1024 * 1024, 65);
  const body = Readable.toWeb(Readable.from((async function* () { for (let index = 0; index < 72; index++) yield chunk; })()));
  const request = new Request("https://beats.example/api/tracks", { method: "POST", body, duplex: "half", headers: { "Content-Type": "multipart/form-data; boundary=large-preamble" } });
  await assert.rejects(upload.parseBoundedTrackForm(request), (error) => error.status === 413);
  const controller = new AbortController(); controller.abort();
  const form = new FormData(); form.set("data", "{}");
  await assert.rejects(upload.parseBoundedTrackForm(new Request("https://beats.example/api/tracks", { method: "POST", body: form, signal: controller.signal })), /cancelled/);
});

test("storeTrackMedia writes sharded private local assets and regenerates previews from retained masters", async (t) => {
  const directory = await temporary(t);
  env(t, { MEDIA_STORAGE_DRIVER: "local", MEDIA_STORAGE_DIR: directory });
  const { adapter, storage, delivery } = sdkHarness();
  const source = makeWav();
  const stored = await storage.storeTrackMedia({ master: new File([source], "source.wav", { type: "audio/wav" }), previewStartSeconds: 5 });
  assert.equal(stored.master.publicUrl, undefined);
  assert.equal(stored.preview.durationSeconds, 30);
  assert.equal(stored.durationSeconds, 40);
  assert.match(stored.master.storageKey, /^[a-f0-9]{2}\/[a-f0-9]{2}\//);
  const regenerated = await storage.storeTrackMedia({ existingMaster: stored.master, previewStartSeconds: 10 });
  const response = await delivery.serveStoredAsset(new Request("https://beats.example/preview"), regenerated.preview);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), wav.createWavPreview(source, 10).preview);
  assert.equal((await stat(adapter.mediaPath(stored.master.key, stored.master.storageKey))).size, source.length);
  await adapter.removeStoredAssets([stored.master, stored.preview, regenerated.preview]);
});

test("per-process upload backpressure releases leases once and rejects excess concurrency", (t) => {
  env(t, { MEDIA_UPLOAD_CONCURRENCY: "1" });
  const release = upload.acquireMediaUploadLease();
  assert.throws(upload.acquireMediaUploadLease, (error) => error.status === 429);
  release(); release();
  const next = upload.acquireMediaUploadLease(); next();
});

test("local delivery streams precise bounded byte ranges, suffixes and HEAD without buffering the whole file", async (t) => {
  const directory = await temporary(t);
  env(t, { MEDIA_STORAGE_DRIVER: "local", MEDIA_STORAGE_DIR: directory });
  const { adapter, delivery } = sdkHarness();
  const key = `${randomUUID()}.preview.wav`;
  await writeFile(path.join(directory, key), Buffer.from("0123456789"));
  const asset = { ...adapter.assetReference(key), storageKey: undefined, mimeType: "audio/wav", sizeBytes: 10 };
  for (const [range, text, status] of [["bytes=2-4", "234", 206], ["bytes=-3", "789", 206], [null, "0123456789", 200]]) {
    const response = await delivery.serveStoredAsset(new Request("https://beats.example/media", { headers: range ? { Range: range } : {} }), asset);
    assert.equal(response.status, status); assert.equal(await response.text(), text);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  }
  const head = await delivery.serveStoredAsset(new Request("https://beats.example/media", { method: "HEAD" }), asset);
  assert.equal(head.headers.get("Content-Length"), "10"); assert.equal(await head.text(), "");
  const invalid = await delivery.serveStoredAsset(new Request("https://beats.example/media", { headers: { Range: "bytes=20-30" } }), asset);
  assert.equal(invalid.status, 416); assert.equal(invalid.headers.get("Content-Range"), "bytes */10");
});

test("range parsing rejects malformed and unsafe input and local paths reject traversal", () => {
  const { adapter, delivery } = sdkHarness();
  for (const range of ["bytes=-0", "bytes=-", "bytes=3-2", "bytes=0-1,3-5", "bytes=999999999999999999999-", "items=0-1"]) assert.throws(() => delivery.parseMediaRange(range, 10), (error) => error.status === 416);
  assert.throws(() => adapter.mediaPath("../../.env"), (error) => error.status === 404);
  const key = `${randomUUID()}.master.wav`;
  assert.throws(() => adapter.mediaPath(key, `../../${key}`), (error) => error.status === 404);
});

test("S3 uploads use private sharded objects with bounded multipart memory and signed download locations", async (t) => {
  env(t, configureS3);
  const directory = await temporary(t); const target = path.join(directory, "file"); await writeFile(target, Buffer.from("private music"));
  const { adapter, delivery, state } = sdkHarness();
  const asset = await adapter.putMediaFile(target, "master.wav", "file.wav", "audio/wav", 30);
  assert.equal(asset.provider, "R2"); assert.equal(asset.publicUrl, undefined);
  assert.match(asset.storageKey, /^media\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9-]{36}\.master\.wav$/);
  assert.equal(state.uploads[0].queueSize, 2); assert.equal(state.uploads[0].partSize, 5 * 1024 * 1024); assert.equal(state.uploads[0].leavePartsOnError, false);
  assert.equal(state.uploads[0].params.ACL, undefined); assert.equal(state.uploads[0].params.CacheControl, "private, no-store");
  const response = await delivery.serveStoredAsset(new Request("https://beats.example/download"), asset, { downloadName: "Purchased beat" });
  assert.equal(response.status, 307); assert.equal(state.signings[0].options.expiresIn, 60);
  assert.equal(state.signings[0].command.input.Key, asset.storageKey); assert.match(state.signings[0].command.input.ResponseContentDisposition, /^attachment;/);
  await adapter.removeStoredAssets([asset]); assert.equal(state.objects.size, 0);
});

test("legacy local assets remain local after selecting S3 and do not contact object storage", async (t) => {
  const directory = await temporary(t); env(t, { ...configureS3, MEDIA_STORAGE_DIR: directory });
  const { delivery, state } = sdkHarness(); const key = `${randomUUID()}.master.wav`;
  await writeFile(path.join(directory, key), "legacy");
  const response = await delivery.serveStoredAsset(new Request("https://beats.example/download"), { key, provider: "OTHER", bucket: "local-private", mimeType: "audio/wav" });
  assert.equal(await response.text(), "legacy"); assert.equal(state.clients.length, 0); assert.equal(state.signings.length, 0);
});

test("selected object storage fails closed when credentials or secure endpoint are missing", (t) => {
  env(t, { ...configureS3, MEDIA_S3_ACCESS_KEY_ID: undefined });
  assert.throws(config.s3Configuration, (error) => error.status === 503);
  process.env.MEDIA_S3_ACCESS_KEY_ID = "key"; process.env.NODE_ENV = "production"; process.env.MEDIA_S3_ENDPOINT = "http://insecure.example";
  assert.throws(config.s3Configuration, (error) => error.status === 503);
});
