import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import mongoose from "mongoose";
import { signAccessToken } from "../lib/auth";
import { consumeApiQuota } from "../lib/security/rate-limit";
import UserModel from "../models/User";
import TrackModel from "../models/Track";
import OrderModel from "../models/Order";
import ApiRateLimit from "../models/ApiRateLimit";
import { GET as download } from "../app/api/orders/[id]/download/route";
import { GET as media } from "../app/api/media/[key]/route";
import { POST as adminCreate } from "../app/api/admin/tracks/route";
import { PATCH as editTrack } from "../app/api/tracks/[id]/route";
import { serializeOrder } from "../lib/payments/orders";
import { marketplaceAudioTrack } from "../lib/audio/marketplace-track";
import type { MarketplaceTrack } from "../lib/marketplace/types";
import { demoTracks } from "../lib/audio/demo-tracks";
import { isHomeDemo } from "../lib/home/media";
import { POST as login } from "../app/api/auth/login/route";
import { POST as register } from "../app/api/auth/register/route";
import { POST as createContract } from "../app/api/contracts/route";
import { GET as callback } from "../app/api/payments/zarinpal/callback/route";

// Real route/auth/entitlement code, with every database and gateway boundary replaced locally.
// The DB cache is explicitly set before any request; no real database/bucket is contacted.
test("API attack regression checks with isolated local boundaries", async t => {
  const cache = (globalThis as typeof globalThis & { mongooseCache: { connection: typeof mongoose | null } }).mongooseCache;
  const connection = cache.connection; cache.connection = mongoose;
  const restore: (() => void)[] = [];
  function replace(object: object, key: string, value: unknown) {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    Object.defineProperty(object, key, { value, configurable: true, writable: true });
    restore.push(() => { if (descriptor) Object.defineProperty(object, key, descriptor); else Reflect.deleteProperty(object, key); });
  }
  const env = { ...process.env };
  process.env.JWT_SECRET = "isolated-security-test-secret-at-least-32-chars";
  const root = await mkdtemp(path.join(os.tmpdir(), "beat-api-security-"));
  process.env.MEDIA_STORAGE_DRIVER = "local"; process.env.MEDIA_STORAGE_DIR = root;
  const buyer = new mongoose.Types.ObjectId(), other = new mongoose.Types.ObjectId(), orderId = new mongoose.Types.ObjectId();
  const master = { provider: "OTHER" as const, bucket: "local-private", key: "00000000-0000-4000-8000-000000000009.master.wav", mimeType: "audio/wav", originalFileName: "secret.wav", sizeBytes: 21, uploadedAt: new Date() };
  await writeFile(path.join(root, master.key), "original-secret-audio");
  master.sizeBytes = (await readFile(path.join(root, master.key))).length;
  let gatewayMode: "live" | "sandbox" = "live";
  let status = "PENDING", userStatus = "ACTIVE", sessionVersion = 0;
  let roles = ["USER"], queries = 0;
  const counts = new Map<string, number>();
  replace(ApiRateLimit, "updateOne", async (filter: { _id: string; count: { $lt: number } }, update: { $inc: { count: number }; $setOnInsert: { expiresAt: Date } }, options: { upsert: boolean }) => {
    assert.equal(options.upsert, true); assert.equal(update.$inc.count, 1); assert.ok(update.$setOnInsert.expiresAt > new Date());
    const count = counts.get(filter._id) ?? 0;
    if (count >= filter.count.$lt) throw Object.assign(new Error("duplicate"), { code: 11000 });
    counts.set(filter._id, count + 1);
  });
  replace(UserModel, "findById", () => ({ select: async () => ({ _id: buyer, id: String(buyer), status: userStatus, roles, sessionVersion }) }));
  replace(OrderModel, "findOne", (filter: Record<string, unknown>) => {
    queries++;
    const value = String(filter._id) === String(orderId) && String(filter.buyerId) === String(buyer) && filter.status === status
      ? { status, gatewayMode, items: [{ master, title: "Purchased" }] } : null;
    return { select: async (selection: string) => { assert.equal(selection, "+items.master"); return value; } };
  });
  const token = signAccessToken({ id: String(buyer), roles: ["USER"] });
  const url = `http://localhost/api/orders/${orderId}/download?item=0`;
  const request = (target = url, extra: HeadersInit = {}, method = "GET") => new Request(target, { method, headers: { Authorization: `Bearer ${token}`, ...extra } });
  const context = { params: Promise.resolve({ id: String(orderId) }) };
  try {
    await t.test("anonymous, forged, revoked and disabled sessions cannot download", async () => {
      assert.equal((await download(new Request(url), context)).status, 401);
      assert.equal((await download(new Request(url, { headers: { Authorization: `Bearer ${token.slice(0, -6)}forged` } }), context)).status, 401);
      sessionVersion = 1; assert.equal((await download(request(), context)).status, 401); sessionVersion = 0;
      userStatus = "DISABLED"; assert.equal((await download(request(), context)).status, 403); userStatus = "ACTIVE";
      assert.equal(queries, 0);
    });
    await t.test("pending/cancelled orders, another buyer and malformed item indexes cannot expose bytes", async () => {
      for (const state of ["PENDING", "CANCELLED"]) { status = state; assert.equal((await download(request(), context)).status, 404); }
      status = "PAID";
      assert.equal((await download(request(url.replace(String(orderId), String(other))), { params: Promise.resolve({ id: String(other) }) })).status, 404);
      // Simulate a paid record belonging to another account; the actual route must filter by buyer.
      const ownFind = OrderModel.findOne;
      replace(OrderModel, "findOne", (filter: Record<string, unknown>) => {
        assert.equal(String(filter.buyerId), String(buyer)); assert.equal(filter.status, "PAID");
        return { select: async () => null };
      });
      assert.equal((await download(request(), context)).status, 404);
      Object.defineProperty(OrderModel, "findOne", { value: ownFind, configurable: true, writable: true });
      for (const item of ["-1", "0foo", "100", "__proto__", "1"]) assert.equal((await download(request(url.replace("item=0", `item=${item}`)), context)).status, 404);
      const allowed = await download(request(), context);
      assert.equal(allowed.status, 200); assert.equal(await allowed.text(), "original-secret-audio");
      assert.equal(allowed.headers.get("location"), null); assert.match(allowed.headers.get("cache-control")!, /no-store/);
      assert.equal((await download(request(url, {}, "HEAD"), context)).status, 200);
    });
    await t.test("sandbox-paid orders cannot unlock production originals", async () => {
      const previous = process.env.NODE_ENV;
      try {
        Object.assign(process.env, { NODE_ENV: "production" }); status = "PAID"; gatewayMode = "sandbox";
        assert.equal((await download(request(), context)).status, 404);
        gatewayMode = "live";
        const response = await download(request(), context); assert.equal(response.status, 200); await response.arrayBuffer();
      } finally { gatewayMode = "live"; if (previous === undefined) Reflect.deleteProperty(process.env, "NODE_ENV"); else Object.assign(process.env, { NODE_ENV: previous }); }
    });
    await t.test("masters and traversal never enter the public media lookup", async () => {
      replace(TrackModel, "findOne", () => { throw new Error("Master requests must stop before database lookup"); });
      for (const key of [master.key, "../secret", "%2e%2e%2fsecret", master.key + ".preview.mp3"]) {
        const response = await media(new Request(`http://localhost/api/media/${key}`), { params: Promise.resolve({ key }) });
        assert.equal(response.status, 404); assert.equal(await response.text(), "");
      }
    });
    await t.test("draft preview authorization runs even when clients request a cached response", async () => {
      const key = master.key.replace(".master.wav", ".preview.mp3");
      replace(TrackModel, "findOne", () => ({ select: async () => ({ producerId: other, status: "DRAFT", visibility: "PRIVATE", audio: { preview: { ...master, key, mimeType: "audio/mpeg", durationSeconds: 30 } } }) }));
      for (const headers of [{}, { "If-None-Match": "*" }, { Range: "bytes=0-10" }] as HeadersInit[]) {
        const response = await media(request(`http://localhost/api/media/${key}`, headers), { params: Promise.resolve({ key }) });
        assert.equal(response.status, 404);
      }
    });
    await t.test("direct admin and other-producer mutation requests stay forbidden", async () => {
      assert.equal((await adminCreate(request("http://localhost/api/admin/tracks", {}, "POST"))).status, 403);
      const elevatedToken = signAccessToken({ id: String(buyer), roles: ["ADMIN"] });
      assert.equal((await adminCreate(request("http://localhost/api/admin/tracks", { Authorization: `Bearer ${elevatedToken}` }, "POST"))).status, 403);
      roles = ["PRODUCER"];
      assert.equal((await createContract(new Request("http://localhost/api/contracts", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ value: "x".repeat(140_000) }) }))).status, 413);
      replace(TrackModel, "findOne", (filter: Record<string, unknown>) => { assert.equal(String(filter.producerId), String(buyer)); return { select: async () => null }; });
      assert.equal((await editTrack(request(`http://localhost/api/tracks/${other}`, {}, "PATCH"), { params: Promise.resolve({ id: String(other) }) })).status, 404);
      roles = ["USER"];
      assert.equal((await download(request(url, { Origin: "https://attacker.test" }), context)).status, 403);
    });
    await t.test("failed download probes and spoofed forwarding headers consume the same quota", async () => {
      counts.clear(); status = "PENDING";
      for (let i = 0; i < 60; i++) assert.equal((await download(request(url, { "X-Forwarded-For": `192.0.2.${i}`, "X-Real-IP": String(i) }), context)).status, 404);
      const response = await download(request(url, { "X-Forwarded-For": "203.0.113.1" }), context);
      assert.equal(response.status, 429); assert.ok(Number(response.headers.get("retry-after")) > 0);
      await consumeApiQuota("another-scope", String(buyer), 1, 60_000);
      await assert.rejects(consumeApiQuota("another-scope", String(buyer), 1, 60_000), /Too many/);
      await consumeApiQuota("another-scope", String(other), 1, 60_000);
    });
    await t.test("rotating emails cannot bypass aggregate login/registration budgets", async () => {
      counts.clear();
      for (const [scope, limit, route] of [["login", 120, login], ["register", 20, register]] as const) {
        for (let i = 0; i < limit; i++) await consumeApiQuota(`${scope}-service`, "all", limit, 60_000);
        const response = await route(new Request(`http://localhost/api/auth/${scope}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": "203.0.113.9" }, body: JSON.stringify({ email: "rotated@example.test" }) }));
        assert.equal(response.status, 429); assert.ok(response.headers.has("retry-after"));
      }
    });
    await t.test("JSON serialization strips originals even from explicitly selected or newly created documents", () => {
      const track = new TrackModel({ producerId: buyer, title: "Secret", audio: { master }, lastUploadRequestId: "hidden" });
      const order = new OrderModel({ buyerId: buyer, items: [{ master, trackId: other, title: "Secret" }], status: "PENDING" });
      assert.equal(JSON.parse(JSON.stringify(track)).audio.master, undefined);
      assert.equal(JSON.parse(JSON.stringify(track)).lastUploadRequestId, undefined);
      assert.equal(JSON.parse(JSON.stringify(order)).items[0].master, undefined);
      const serialized = serializeOrder(order);
      assert.equal(serialized.items[0].downloadUrl, null);
      assert.ok(!JSON.stringify(serialized).includes(master.key));
      assert.equal(marketplaceAudioTrack({ previewUrl: "/api/media/preview.mp3", audio: { master } } as unknown as MarketplaceTrack).src, "/api/media/preview.mp3");
    });
    await t.test("forged payment callbacks cannot set PAID without gateway verification", async () => {
      process.env.APP_URL = "https://shop.example.test"; process.env.ZARINPAL_MERCHANT_ID = "00000000-0000-4000-8000-000000000001";
      const authority = "A" + "1".repeat(35); let paid = false;
      replace(OrderModel, "findOne", async () => ({ _id: orderId, authority, status: "PENDING", total: 12345, gatewayMode: "live" }));
      replace(OrderModel, "updateOne", async () => { paid = true; return { matchedCount: 1 }; });
      replace(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
        const body = JSON.parse(String(init.body)); assert.equal(body.amount, 12345); assert.equal(body.authority, authority);
        return Response.json({ data: { code: -21 } });
      });
      const response = await callback(new Request(`https://shop.example.test/api/payments/zarinpal/callback?Authority=${authority}&Status=OK&amount=1&status=PAID`));
      assert.match(response.headers.get("location")!, /unverified/); assert.equal(paid, false);
    });
    await t.test("public demos have cropped sources and no original download URL", () => {
      for (const track of demoTracks) {
        assert.equal(track.durationLimitSeconds, 30);
        assert.equal(track.downloadSrc, undefined);
        assert.equal(track.src, `/api/home/media/${track.id}-128`);
        assert.equal(track.lowDataSrc, `/api/home/media/${track.id}-96`);
        assert.equal(track.coverUrl, `/api/home/media/${track.id}-cover`);
      }
      const preview = { ...master, provider: "S3" as const, key: master.key.replace(".master.wav", ".preview.mp3"), mimeType: "audio/mpeg", sizeBytes: 480_000, durationSeconds: 30 };
      assert.ok(isHomeDemo(preview));
      assert.equal(isHomeDemo(master), false);
      assert.equal(isHomeDemo({ ...preview, durationSeconds: 31 }), false);
      assert.equal(isHomeDemo({ ...preview, sizeBytes: 600_000 }), false);
    });
  } finally {
    for (const reset of restore.reverse()) reset(); cache.connection = connection;
    for (const key of Object.keys(process.env)) if (!(key in env)) delete process.env[key];
    Object.assign(process.env, env); await rm(root, { recursive: true, force: true });
  }
});
