import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import mongoose from "mongoose";
import { signAccessToken } from "../lib/auth";
import { mediaPath } from "../lib/media/adapter";
import RateLimit from "../models/ApiRateLimit";
import User from "../models/User";
import Kit from "../models/StudioProduct";
import Order from "../models/Order";
import KitOrder from "../models/SoundKitOrder";
import { POST as upload } from "../app/api/studio-products/sound-kits/[id]/asset/route";
import { PATCH as publish } from "../app/api/studio-products/[kind]/[id]/route";
import { POST as checkout } from "../app/api/sound-kits/orders/route";
import { GET as callback } from "../app/api/payments/zarinpal/callback/route";
import { GET as download } from "../app/api/sound-kits/orders/[id]/download/route";

test("sound kit upload to verified sandbox download with isolated dependencies", async (t) => {
  const realSandbox = process.env.RUN_REAL_ZARINPAL_SANDBOX === "1";
  const cache = (
    globalThis as unknown as { mongooseCache: { connection: unknown } }
  ).mongooseCache;
  const root = await mkdtemp(join(tmpdir(), "beat-kit-test-"));
  const originalConnection = cache.connection;
  cache.connection = mongoose;
  const env = { ...process.env };
  t.after(async () => {
    cache.connection = originalConnection;
    for (const key of Object.keys(process.env))
      if (!(key in env)) Reflect.deleteProperty(process.env, key);
    Object.assign(process.env, env);
    await rm(root, { recursive: true, force: true });
  });
  Object.assign(process.env, {
    JWT_SECRET: "isolated-sound-kit-test-secret-at-least-32",
    MEDIA_STORAGE_DRIVER: "local",
    MEDIA_STORAGE_DIR: root,
    ZARINPAL_SANDBOX: "true",
    ZARINPAL_MERCHANT_ID: realSandbox
      ? env.ZARINPAL_MERCHANT_ID
      : "00000000-0000-4000-8000-000000000001",
    APP_URL: realSandbox ? "http://localhost:3000" : "http://localhost",
    NODE_ENV: "test",
  });
  process.env.SOUND_KIT_ENCRYPTION_KEY ??= randomBytes(32).toString("base64");
  const producerId = new mongoose.Types.ObjectId();
  const buyerId = new mongoose.Types.ObjectId();
  const otherId = new mongoose.Types.ObjectId();
  const kit = new Kit({
    producerId,
    kind: "SOUND_KIT",
    title: "Test kit",
    priceToman: 12000,
    createdAt: new Date(),
  });
  const id = String(kit._id);
  const authority = "A" + "1".repeat(35);
  let order: InstanceType<typeof KitOrder> | undefined;
  let verified = false;
  t.mock.method(RateLimit, "updateOne", async () => ({ matchedCount: 1 }));
  t.mock.method(User, "findById", (value: string) => ({
    select: async () => ({
      _id: value,
      id: String(value),
      status: "ACTIVE",
      sessionVersion: 0,
      email: "fixture@example.test",
      roles: String(value) === String(producerId) ? ["PRODUCER"] : ["USER"],
    }),
  }));
  t.mock.method(User, "exists", async () => ({ _id: producerId }));
  t.mock.method(
    Kit,
    "findOneAndUpdate",
    async (_filter: unknown, update: { $set: Record<string, unknown> }) => {
      kit.set(update.$set);
      kit.version++;
      kit.assetVersion++;
      return kit;
    },
  );
  t.mock.method(Kit, "findOne", () => ({ select: async () => kit }));
  t.mock.method(Kit.prototype, "save", async () => kit);
  t.mock.method(
    KitOrder.prototype,
    "save",
    async function (this: InstanceType<typeof KitOrder>) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias -- the mocked document is the value under test.
      order = this;
      return this;
    },
  );
  t.mock.method(Order, "findOne", async () => null);
  t.mock.method(KitOrder, "findOne", (filter: Record<string, unknown>) => {
    if (filter.authority)
      return order?.authority === filter.authority ? order : null;
    if (filter.idempotencyKey) return null;
    return {
      select: async () =>
        order?.status === filter.status &&
        String(order?.buyerId) === String(filter.buyerId)
          ? order
          : null,
    };
  });
  t.mock.method(
    KitOrder,
    "updateOne",
    async (_filter: unknown, update: { $set: Record<string, unknown> }) => {
      order?.set(update.$set);
      return { matchedCount: 1 };
    },
  );
  if (!realSandbox)
    t.mock.method(
      globalThis,
      "fetch",
      async (url: string, init: RequestInit) => {
        assert.match(url, /^https:\/\/sandbox\.zarinpal\.com\//);
        assert.equal(JSON.parse(String(init.body)).amount, 12000);
        if (url.endsWith("/request.json"))
          return Response.json({ data: { code: 100, authority } });
        assert.match(url, /\/verify\.json$/);
        return Response.json({
          data: verified ? { code: 100, ref_id: 1234 } : { code: -1 },
        });
      },
    );
  function request(
    path: string,
    user?: mongoose.Types.ObjectId,
    method = "GET",
    body?: FormData | Record<string, unknown>,
  ) {
    const origin = process.env.APP_URL!;
    const headers = new Headers({ Origin: origin });
    if (user)
      headers.set(
        "Authorization",
        `Bearer ${signAccessToken({ id: String(user), roles: [] })}`,
      );
    if (body && !(body instanceof FormData))
      headers.set("Content-Type", "application/json");
    return new Request(`${origin}${path}`, {
      method,
      headers,
      body:
        body instanceof FormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
    });
  }
  const archive = execFileSync("zip", ["-q", "-", "-"], {
    input: "isolated audio fixture",
  });
  const form = new FormData();
  form.set(
    "kit",
    new Blob([new Uint8Array(archive)], { type: "application/zip" }),
    "kit.zip",
  );
  const uploaded = await upload(request("/upload", producerId, "POST", form), {
    params: Promise.resolve({ id }),
  });
  assert.equal(uploaded.status, 200, await uploaded.clone().text());
  const stored = await readFile(
    mediaPath(kit.encryptedAsset!.key, kit.encryptedAsset!.storageKey),
  );
  assert.notDeepEqual(stored, archive);
  assert.equal(stored.includes("isolated audio fixture"), false);
  const published = await publish(
    request("/publish", producerId, "PATCH", {
      title: "Test kit",
      status: "PUBLISHED",
      priceToman: 12000,
      expectedVersion: kit.version,
      assetName: kit.assetName,
      assetMimeType: kit.assetMimeType,
      assetSizeBytes: kit.assetSizeBytes,
    }),
    { params: Promise.resolve({ kind: "sound-kits", id }) },
  );
  assert.equal(published.status, 200, await published.clone().text());
  assert.doesNotMatch(
    await published.text(),
    /encryptedAsset|kit\.enc|downloadUrl/,
  );
  const started = await checkout(
    request("/checkout", buyerId, "POST", {
      kitId: id,
      expectedVersion: kit.version,
      expectedAssetVersion: kit.assetVersion,
      expectedPrice: 12000,
      idempotencyKey: "00000000-0000-4000-8000-000000000002",
    }),
  );
  assert.equal(started.status, 201, await started.clone().text());
  const pending = await started.json();
  assert.equal(pending.order.downloadUrl, null);
  assert.doesNotMatch(JSON.stringify(pending), /encryptedAsset|kit\.enc/);
  const path = `/api/sound-kits/orders/${pending.order.id}/download`;
  const context = { params: Promise.resolve({ id: pending.order.id }) };
  assert.equal((await download(request(path), context)).status, 401);
  assert.equal((await download(request(path, buyerId), context)).status, 404);
  const returned = () =>
    callback(
      request(
        `/api/payments/zarinpal/callback?Authority=${authority}&Status=OK`,
      ),
    );
  if (realSandbox) {
    const payment = new URL(pending.paymentUrl);
    assert.equal(payment.origin, "https://sandbox.zarinpal.com");
    assert.match(payment.pathname, /^\/pg\/StartPay\/S[a-zA-Z0-9]{35}$/);
    const html = await (
      await fetch(payment, { signal: AbortSignal.timeout(15000) })
    ).text();
    const action = html.match(
      /href="https?:\/\/sandbox\.zarinpal\.com(\/pg\/verify\/[a-zA-Z0-9]+\/\?status=OK)"/,
    )?.[1];
    assert.ok(action, "The sandbox page must offer a successful test payment");
    const result = await fetch(new URL(action, payment.origin), {
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    const destination = new URL(result.headers.get("location") ?? "");
    assert.equal(destination.origin, process.env.APP_URL);
    assert.equal(destination.pathname, "/api/payments/zarinpal/callback");
    assert.equal(destination.searchParams.get("Authority"), order?.authority);
    assert.equal(destination.searchParams.get("Status"), "OK");
    assert.match(
      (await callback(new Request(destination))).headers.get("location") ?? "",
      /payment=verified$/,
    );
  } else {
    assert.match(
      (await returned()).headers.get("location") ?? "",
      /payment=unverified$/,
    );
    assert.equal((await download(request(path, buyerId), context)).status, 404);
    verified = true;
    assert.match(
      (await returned()).headers.get("location") ?? "",
      /payment=verified$/,
    );
  }
  assert.equal((await download(request(path, otherId), context)).status, 404);
  const file = await download(request(path, buyerId), context);
  assert.equal(file.status, 200);
  assert.equal(file.headers.get("location"), null);
  assert.deepEqual(Buffer.from(await file.arrayBuffer()), archive);
});
