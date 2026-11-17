import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScript } from "./load-typescript.mjs";

const validation = loadTypeScript(new URL("../lib/marketplace/validation.ts", import.meta.url));
const legacyValidation = loadTypeScript(new URL("../lib/validation.ts", import.meta.url));
const discountHelpers = loadTypeScript(new URL("../lib/marketplace/discounts.ts", import.meta.url));
const discountServer = loadTypeScript(new URL("../lib/marketplace/discount-server.ts", import.meta.url));
const marketplace = loadTypeScript(new URL("../lib/marketplace/server.ts", import.meta.url), {
  "@/lib/auth": {}, "@/lib/validation": legacyValidation,
  "@/models/Contract": {}, "@/models/Genre": {}, "@/models/ProducerProfile": {}, "@/models/User": {},
  "@/models/TrackDiscount": {}, "@/models/Track": {}, "@/lib/marketplace/discounts": discountHelpers,
  "@/lib/marketplace/discount-server": discountServer, "@/lib/media/upload": {},
});
const { serializeOrder } = loadTypeScript(new URL("../lib/payments/orders.ts", import.meta.url));
const buyerId = "111111111111111111111111";
const producerId = "222222222222222222222222";
const trackId = "333333333333333333333333";
const contractId = "444444444444444444444444";
const orderId = "555555555555555555555555";
const idempotencyKey = "00000000-0000-4000-8000-000000000001";
const authority = `A${"0".repeat(35)}`;
const validPayload = () => ({ idempotencyKey, acceptTerms: true, items: [{ trackId, contractId, expectedPrice: "150000", expectedVersion: 3 }] });

function deniedResponse() { return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401 }); }

function orderHarness({ authenticated = true } = {}) {
  const state = {
    user: { id: buyerId, _id: buyerId, email: "buyer@example.test" },
    track: { _id: trackId, producerId, title: "Original track", audio: { master: { provider: "OTHER", bucket: "local-private", key: "original-private.master.wav", mimeType: "audio/wav", originalFileName: "original.wav", sizeBytes: 1000, uploadedAt: new Date() } } },
    contract: { _id: contractId, producerId, title: "WAV license", version: 3, price: { toString: () => "150000" }, description: "Original description", currency: "IRT",
      terms: { licenseType: "NON_EXCLUSIVE", streamingLimit: 100_000, distributionLimit: 1000, customTerms: "Credit the producer" }, territory: { worldwide: true }, filesToDeliver: [{ format: "WAV", required: true }] },
    producerActive: true, trackAvailable: true, contractAvailable: true, gatewayError: false,
    discounts: [], orders: [], lookupFilters: [], trackFilters: [], contractFilters: [], paymentCalls: [], createdPayloads: [], updates: [],
  };
  const orderModel = {
    async findOne(filter) {
      state.lookupFilters.push(filter);
      return state.orders.find((order) => order.buyerId === filter.buyerId && order.idempotencyKey === filter.idempotencyKey) ?? null;
    },
    async create(payload) {
      const duplicate = state.orders.some((order) => order.buyerId === payload.buyerId && order.idempotencyKey === payload.idempotencyKey);
      if (duplicate) throw Object.assign(new Error("duplicate"), { code: 11000 });
      state.createdPayloads.push(structuredClone(payload));
      const order = { ...structuredClone(payload), _id: orderId, createdAt: new Date(), save: async () => undefined };
      state.orders.push(order);
      return order;
    },
    async updateOne(filter, update) {
      state.updates.push({ filter, update });
      const order = state.orders.find((item) => item._id === filter._id && item.status === filter.status);
      if (order) Object.assign(order, update.$set);
      return { matchedCount: order ? 1 : 0 };
    },
  };
  const route = loadTypeScript(new URL("../app/api/orders/route.ts", import.meta.url), {
    "@/lib/auth": { authenticateRequest: async () => authenticated ? { ok: true, user: state.user } : { ok: false, response: deniedResponse() } },
    "@/lib/marketplace/server": { ...marketplace, producerIsPublic: async () => state.producerActive },
    "@/lib/marketplace/validation": validation,
    "@/lib/payments/zarinpal": {
      paymentConfiguration: () => ({ mode: "sandbox" }), gatewayOrigin: () => "https://sandbox.zarinpal.com",
      requestPayment: async (...args) => {
        state.paymentCalls.push(args);
        if (state.gatewayError) throw Object.assign(new Error("Gateway unavailable"), { status: 502 });
        return { authority, url: `https://sandbox.zarinpal.com/pg/StartPay/${authority}` };
      },
    },
    "@/models/Contract": { __esModule: true, default: { findOne: async (filter) => { state.contractFilters.push(filter); return state.contractAvailable ? state.contract : null; } } },
    "@/models/Order": { __esModule: true, default: orderModel },
    "@/lib/payments/orders": { serializeOrder },
    "@/models/Track": { __esModule: true, default: { findOne: (filter) => { state.trackFilters.push(filter); return { select: async () => state.trackAvailable ? state.track : null }; } } },
    "@/models/TrackDiscount": { __esModule: true, default: { find: async () => state.discounts.filter((discount) => discountHelpers.discountIsActive({ ...discount, startsAt: discount.startsAt.toISOString(), endsAt: discount.endsAt.toISOString() })) } },
    "@/lib/marketplace/discounts": discountHelpers, "@/lib/marketplace/discount-server": discountServer,
  });
  return { state, post: (payload = validPayload()) => route.POST(new Request("https://beats.example/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })) };
}

test("checkout requires authentication and explicit acceptance before making a gateway request", async () => {
  const anonymous = orderHarness({ authenticated: false });
  assert.equal((await anonymous.post()).status, 401);
  assert.equal(anonymous.state.paymentCalls.length, 0);
  const declined = orderHarness();
  assert.equal((await declined.post({ ...validPayload(), acceptTerms: false })).status, 400);
  assert.equal(declined.state.paymentCalls.length, 0);
});

test("stale license prices or versions cannot be charged and create no order", async () => {
  for (const changes of [{ expectedPrice: "1" }, { expectedVersion: 2 }]) {
    const harness = orderHarness();
    const payload = validPayload(); Object.assign(payload.items[0], changes);
    assert.equal((await harness.post(payload)).status, 409);
    assert.equal(harness.state.paymentCalls.length, 0);
    assert.equal(harness.state.orders.length, 0);
  }
});

test("own tracks, exclusive licenses and unsupported deliverables cannot enter online checkout", async () => {
  const own = orderHarness(); own.state.track.producerId = buyerId;
  assert.equal((await own.post()).status, 400);
  const exclusive = orderHarness(); exclusive.state.contract.terms.licenseType = "EXCLUSIVE";
  assert.equal((await exclusive.post()).status, 409);
  const absentFiles = orderHarness(); absentFiles.state.contract.filesToDeliver = [{ format: "STEMS", required: true }];
  assert.equal((await absentFiles.post()).status, 409);
  for (const harness of [own, exclusive, absentFiles]) {
    assert.equal(harness.state.paymentCalls.length, 0);
    assert.equal(harness.state.orders.length, 0);
  }
});

test("unavailable tracks, inactive producers and missing licenses cannot be purchased", async () => {
  for (const field of ["trackAvailable", "producerActive", "contractAvailable"]) {
    const harness = orderHarness(); harness.state[field] = false;
    assert.equal((await harness.post()).status, 409);
    assert.equal(harness.state.paymentCalls.length, 0);
  }
});

test("a successful checkout snapshots server price, version, terms and master without exposing the master", async () => {
  const harness = orderHarness();
  const response = await harness.post();
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.order.total, 150_000);
  assert.equal(result.order.currency, "IRT");
  assert.equal(result.order.items[0].downloadUrl, null);
  assert.equal(JSON.stringify(result).includes("original-private.master.wav"), false);
  assert.equal(JSON.stringify(result).includes("local-private"), false);
  assert.deepEqual(harness.state.paymentCalls, [[orderId, 150_000, "buyer@example.test"]]);
  const snapshot = harness.state.createdPayloads[0];
  assert.equal(snapshot.items[0].master.key, "original-private.master.wav");
  assert.equal(snapshot.items[0].contractVersion, 3);
  assert.equal(snapshot.items[0].price, 150_000);
  assert.equal(JSON.parse(snapshot.items[0].terms).terms.streamingLimit, 100_000);
  harness.state.contract.terms.streamingLimit = 1;
  harness.state.track.audio.master.key = "changed.master.wav";
  assert.equal(JSON.parse(snapshot.items[0].terms).terms.streamingLimit, 100_000);
  assert.equal(snapshot.items[0].master.key, "original-private.master.wav");
  assert.equal(harness.state.trackFilters[0].status, "PUBLISHED");
  assert.equal(harness.state.trackFilters[0].visibility, "PUBLIC");
  assert.equal(harness.state.contractFilters[0].producerId, producerId);
  assert.equal(harness.state.contractFilters[0].isActive, true);
  assert.equal(harness.state.contractFilters[0].currency, "IRT");
});

test("retrying the same buyer and idempotency key reuses one order and gateway authority", async () => {
  const harness = orderHarness();
  const first = await (await harness.post()).json();
  const retryResponse = await harness.post();
  const retry = await retryResponse.json();
  assert.equal(retryResponse.status, 200);
  assert.equal(first.order.id, retry.order.id);
  assert.equal(first.paymentUrl, retry.paymentUrl);
  assert.equal(harness.state.orders.length, 1);
  assert.equal(harness.state.paymentCalls.length, 1);
  for (const filter of harness.state.lookupFilters) assert.deepEqual(filter, { buyerId, idempotencyKey });
});

test("paid retries redirect to orders while cancelled attempts require a fresh checkout", async () => {
  const harness = orderHarness();
  await harness.post();
  harness.state.orders[0].status = "PAID";
  const paid = await (await harness.post()).json();
  assert.equal(paid.redirectUrl, "/dashboard/orders");
  assert.equal(paid.paymentUrl, undefined);
  harness.state.orders[0].status = "CANCELLED";
  const cancelled = await harness.post();
  assert.equal(cancelled.status, 409);
  assert.equal((await cancelled.json()).resetCheckout, true);
  assert.equal(harness.state.paymentCalls.length, 1);
});

test("a pending order without an authority cannot trigger a second gateway request", async () => {
  const harness = orderHarness();
  await harness.post(); delete harness.state.orders[0].authority;
  assert.equal((await harness.post()).status, 409);
  assert.equal(harness.state.paymentCalls.length, 1);
});

test("gateway failures cancel the attempt and its idempotency key cannot produce another charge", async () => {
  const harness = orderHarness(); harness.state.gatewayError = true;
  assert.equal((await harness.post()).status, 502);
  assert.equal(harness.state.orders[0].status, "CANCELLED");
  assert.equal((await harness.post()).status, 409);
  assert.equal(harness.state.paymentCalls.length, 1);
});

function activePromotion() {
  return { _id: "666666666666666666666666", producerId, trackId, percentage: 20, startsAt: new Date(Date.now() - 60_000), endsAt: new Date(Date.now() + 60_000), isActive: true, version: 4 };
}

test("checkout computes the active track discount itself and freezes the complete promotion snapshot", async () => {
  const harness = orderHarness(); harness.state.discounts.push(activePromotion());
  const payload = validPayload(); Object.assign(payload.items[0], { expectedPrice: "120000", expectedDiscountVersion: 4 });
  const response = await harness.post(payload);
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.order.total, 120_000);
  assert.equal(result.order.items[0].originalPrice, 150_000);
  assert.equal(result.order.items[0].discountAmount, 30_000);
  assert.equal(result.order.items[0].discount.percentage, 20);
  assert.equal(result.order.items[0].discount.version, 4);
  assert.equal(harness.state.paymentCalls[0][1], 120_000);
  const snapshot = harness.state.createdPayloads[0];
  harness.state.discounts[0].percentage = 80;
  assert.equal(snapshot.items[0].discount.percentage, 20);
  assert.equal(snapshot.items[0].price, 120_000);
});

test("expired, scheduled, disabled and another producer's promotions cannot reduce the charged price", async () => {
  for (const changes of [{ endsAt: new Date(Date.now() - 1) }, { startsAt: new Date(Date.now() + 30_000) }, { isActive: false }, { producerId: buyerId }]) {
    const harness = orderHarness(); harness.state.discounts.push({ ...activePromotion(), ...changes });
    const payload = validPayload(); payload.items[0].expectedPrice = "120000";
    assert.equal((await harness.post(payload)).status, 409);
    assert.equal(harness.state.orders.length, 0);
    assert.equal(harness.state.paymentCalls.length, 0);
  }
});

test("a changed campaign version is rejected even if rounding leaves the same effective price", async () => {
  const harness = orderHarness(); harness.state.discounts.push(activePromotion());
  const payload = validPayload(); Object.assign(payload.items[0], { expectedPrice: "120000", expectedDiscountVersion: 3 });
  assert.equal((await harness.post(payload)).status, 409);
  assert.equal(harness.state.orders.length, 0);
});

test("idempotent pending and paid order retries retain the quoted discount after its campaign ends", async () => {
  const harness = orderHarness(); harness.state.discounts.push(activePromotion());
  const payload = validPayload(); Object.assign(payload.items[0], { expectedPrice: "120000", expectedDiscountVersion: 4 });
  assert.equal((await harness.post(payload)).status, 201);
  harness.state.discounts[0].endsAt = new Date(Date.now() - 1);
  const pending = await (await harness.post(payload)).json();
  assert.equal(pending.order.total, 120_000);
  assert.equal(pending.order.items[0].discountAmount, 30_000);
  harness.state.orders[0].status = "PAID";
  const paid = await (await harness.post(payload)).json();
  assert.equal(paid.order.total, 120_000);
  assert.equal(paid.redirectUrl, "/dashboard/orders");
  assert.equal(harness.state.paymentCalls.length, 1);
});

test("discounted items below 1,000 toman remain exact but a too-small gateway total is rejected", async () => {
  const harness = orderHarness(); harness.state.discounts.push({ ...activePromotion(), percentage: 90 });
  harness.state.contract.price = { toString: () => "1000" };
  const payload = validPayload(); payload.items[0].expectedPrice = "100";
  const response = await harness.post(payload);
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /minimum gateway payment/);
  assert.equal(harness.state.orders.length, 0);
});

function downloadHarness({ authenticated = true, orderBuyerId = buyerId, status = "PAID" } = {}) {
  const state = { lookups: [], reads: [], storedOrder: { _id: orderId, buyerId: orderBuyerId, status, items: [{ title: "Purchased beat", master: { key: "purchased-original.master.wav" } }] } };
  const route = loadTypeScript(new URL("../app/api/orders/[id]/download/route.ts", import.meta.url), {
    "@/lib/auth": { authenticateRequest: async () => authenticated ? { ok: true, user: { id: buyerId, _id: buyerId } } : { ok: false, response: deniedResponse() } },
    "@/lib/marketplace/server": marketplace,
    "@/lib/marketplace/validation": validation,
    "@/lib/media/storage": {
      readStoredAsset: async (key) => { state.reads.push(key); return Buffer.from("private purchased bytes"); },
      serveStoredAsset: async (_request, asset, options) => { state.reads.push(asset.key); return new Response("private purchased bytes", { headers: { "Cache-Control": "private, no-store", "Content-Type": "audio/wav", "Content-Disposition": `attachment; filename="${options?.downloadName ?? "track.wav"}"` } }); },
    },
    "@/models/Order": { __esModule: true, default: { findOne: (filter) => {
      state.lookups.push(filter);
      return { select: async () => filter._id === state.storedOrder._id && filter.buyerId === state.storedOrder.buyerId && filter.status === state.storedOrder.status ? state.storedOrder : null };
    } } },
  });
  return { state, get: (item = "0") => route.GET(new Request(`https://beats.example/api/orders/${orderId}/download?item=${encodeURIComponent(item)}`), { params: Promise.resolve({ id: orderId }) }) };
}

test("full-file downloads require the authenticated buyer and a paid order", async () => {
  for (const options of [{ authenticated: false }, { orderBuyerId: producerId }, { status: "PENDING" }, { status: "CANCELLED" }]) {
    const harness = downloadHarness(options);
    assert.equal((await harness.get()).status, options.authenticated === false ? 401 : 404);
    assert.equal(harness.state.reads.length, 0);
  }
});

test("paid downloads use the purchased master snapshot and disable shared caching", async () => {
  const harness = downloadHarness();
  const response = await harness.get();
  assert.equal(response.status, 200);
  assert.deepEqual(harness.state.reads, ["purchased-original.master.wav"]);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("Content-Type"), "audio/wav");
  assert.match(response.headers.get("Content-Disposition"), /^attachment;/);
  assert.equal(await response.text(), "private purchased bytes");
  assert.deepEqual(harness.state.lookups[0], { _id: orderId, buyerId, status: "PAID" });
});

test("invalid purchased item indexes never read files", async () => {
  const harness = downloadHarness();
  for (const index of ["-1", "1", "0.5", "100", "x", ""]) assert.equal((await harness.get(index)).status, 404);
  assert.equal(harness.state.reads.length, 0);
});
