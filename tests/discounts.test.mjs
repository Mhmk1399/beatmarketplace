import assert from "node:assert/strict";
import test from "node:test";
import { NextResponse } from "next/server.js";
import { loadTypeScript } from "./load-typescript.mjs";

const helpers = loadTypeScript(new URL("../lib/marketplace/discounts.ts", import.meta.url));
const validation = loadTypeScript(new URL("../lib/marketplace/validation.ts", import.meta.url));
const schemas = loadTypeScript(new URL("../lib/marketplace/discount-validation.ts", import.meta.url), { "@/lib/marketplace/validation": validation });
const serializer = loadTypeScript(new URL("../lib/marketplace/discount-server.ts", import.meta.url));
const begins = "2026-11-17T10:00:00.000Z";
const ends = "2026-11-17T11:00:00.000Z";
const offer = { percentage: 25, startsAt: begins, endsAt: ends, isActive: true };

test("discount start is inclusive and its UTC end is exclusive without depending on browser time zone", () => {
  assert.equal(helpers.discountIsActive(offer, Date.parse(begins) - 1), false);
  assert.equal(helpers.discountIsActive(offer, Date.parse(begins)), true);
  assert.equal(helpers.discountIsActive(offer, Date.parse(ends) - 1), true);
  assert.equal(helpers.discountIsActive(offer, Date.parse(ends)), false);
  assert.equal(helpers.discountIsActive({ ...offer, startsAt: "2026-11-17T13:30:00+03:30" }, Date.parse(begins)), true);
});

test("integer toman discounts round half-up exactly and do not stack on a cached sale price", () => {
  const now = Date.parse(begins);
  assert.equal(helpers.computeDiscountedPrice("1001", { ...offer, percentage: 50 }, now), 501);
  assert.equal(helpers.computeDiscountedPrice(1_000_000_000, { ...offer, percentage: 90 }, now), 100_000_000);
  assert.equal(helpers.computeDiscountedPrice(1000, { ...offer, percentage: 90 }, now), 100);
  assert.equal(helpers.effectiveLicensePrice({ price: "75000", originalPrice: "100000", discount: offer }, now), 75000);
  assert.equal(helpers.effectiveLicensePrice({ price: "75000", originalPrice: "100000", discount: offer }, Date.parse(ends)), 100000);
  assert.equal(helpers.effectiveLicensePrice({ price: "100000" }, now), 100000);
  for (const value of [0, -1, 10.5, NaN, Infinity, "0.1", 1_000_000_001]) assert.throws(() => helpers.computeDiscountedPrice(value, offer, now), RangeError);
});

test("disabled, malformed and out-of-bounds percentages never activate a lower price", () => {
  const now = Date.parse(begins);
  for (const changes of [{ isActive: false }, { startsAt: "bad" }, { endsAt: "bad" }, { percentage: 0 }, { percentage: 91 }, { percentage: 2.5 }]) {
    assert.equal(helpers.discountIsActive({ ...offer, ...changes }, now), false);
    assert.equal(helpers.computeDiscountedPrice(100000, { ...offer, ...changes }, now), 100000);
  }
  assert.equal(helpers.discountStatus({ ...offer, isActive: false }, now), "DISABLED");
  assert.equal(helpers.discountStatus(offer, now - 1), "SCHEDULED");
  assert.equal(helpers.discountStatus(offer, now), "ACTIVE");
  assert.equal(helpers.discountStatus(offer, Date.parse(ends)), "EXPIRED");
});

test("discount request validation requires zoned instants, whole bounded percentages and no ownership injection", () => {
  const valid = { trackId: "111111111111111111111111", percentage: 25, startsAt: begins, endsAt: ends };
  assert.equal(schemas.discountCreateSchema.safeParse(valid).success, true);
  assert.equal(schemas.discountCreateSchema.safeParse({ ...valid, startsAt: "2026-11-17T10:00" }).success, false);
  for (const percentage of [0, 91, 12.5, "20"]) assert.equal(schemas.discountCreateSchema.safeParse({ ...valid, percentage }).success, false);
  assert.equal(schemas.discountCreateSchema.safeParse({ ...valid, producerId: "222222222222222222222222" }).success, false);
  assert.equal(schemas.discountPatchSchema.safeParse({ trackId: valid.trackId }).success, false);
  assert.equal(schemas.discountPatchSchema.safeParse({}).success, false);
  assert.deepEqual(schemas.discountPatchSchema.parse({ percentage: 30 }), { percentage: 30 });
});

test("campaign windows reject reversed, expired active, invalid and excessively long durations", () => {
  const now = new Date(begins);
  assert.equal(schemas.validateDiscountWindow({ startsAt: new Date(begins), endsAt: new Date(ends), isActive: true }, now), null);
  assert.match(schemas.validateDiscountWindow({ startsAt: new Date(ends), endsAt: new Date(begins), isActive: true }, now), /after/);
  assert.match(schemas.validateDiscountWindow({ startsAt: new Date(begins), endsAt: new Date(Date.parse(begins) + 91 * 86400_000), isActive: true }, now), /90 days/);
  assert.match(schemas.validateDiscountWindow({ startsAt: new Date(begins), endsAt: new Date(ends), isActive: true }, new Date(ends)), /future/);
  assert.equal(schemas.validateDiscountWindow({ startsAt: new Date(begins), endsAt: new Date(ends), isActive: false }, new Date(ends)), null);
});

const producerId = "111111111111111111111111";
const otherId = "222222222222222222222222";
const trackId = "333333333333333333333333";
const discountId = "444444444444444444444444";

function routeHarness({ authorized = true, owner = producerId } = {}) {
  const state = { rows: [], finds: [], saves: 0, trackOwner: owner, trackStatus: "PUBLISHED" };
  const track = { _id: trackId, producerId: owner, title: "Test beat", status: "PUBLISHED" };
  class DiscountModel {
    constructor(values) { Object.assign(this, { _id: discountId, version: 1 }, values); }
    async save() { state.saves++; if (!state.rows.includes(this)) state.rows.push(this); }
    static async findOne(filter) { state.finds.push(filter); return state.rows.find((row) => (!filter._id || String(row._id) === filter._id) && (!filter.trackId || String(row.trackId) === String(filter.trackId)) && (!filter.producerId || String(row.producerId) === String(filter.producerId))) ?? null; }
  }
  class MarketplaceError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
  const marketplace = {
    requireMarketplaceRole: async (_request, role) => authorized && role === "PRODUCER" ? { ok: true, user: { _id: producerId, id: producerId } } : { ok: false, response: NextResponse.json({ error: "Producer access required." }, { status: 403 }) },
    MarketplaceError,
    marketplaceError: (error) => NextResponse.json({ error: error.message }, { status: error.status ?? 400 }),
  };
  const mocks = {
    "@/lib/marketplace/discount-validation": schemas, "@/lib/marketplace/discount-server": serializer,
    "@/lib/marketplace/validation": validation, "@/lib/marketplace/server": marketplace,
    "@/models/TrackDiscount": { __esModule: true, default: DiscountModel },
    "@/models/Track": { __esModule: true, default: { findOne: (filter) => ({ select: async () => state.trackOwner === String(filter.producerId) && (filter.status?.$ne !== state.trackStatus) ? { ...track, status: state.trackStatus } : null }) } },
  };
  const collection = loadTypeScript(new URL("../app/api/discounts/route.ts", import.meta.url), mocks);
  const single = loadTypeScript(new URL("../app/api/discounts/[id]/route.ts", import.meta.url), mocks);
  const request = (method, data) => new Request("https://beats.example/api/discounts", { method, headers: { "Content-Type": "application/json" }, ...(data ? { body: JSON.stringify(data) } : {}) });
  return {
    state,
    create: (data) => collection.POST(request("POST", data)),
    patch: (data, id = discountId) => single.PATCH(request("PATCH", data), { params: Promise.resolve({ id }) }),
    remove: (id = discountId) => single.DELETE(request("DELETE"), { params: Promise.resolve({ id }) }),
  };
}
const futureWindow = () => ({ trackId, percentage: 20, startsAt: new Date(Date.now() - 1000).toISOString(), endsAt: new Date(Date.now() + 60_000).toISOString() });

test("only producers can create promotions and only for their own available tracks", async () => {
  const denied = routeHarness({ authorized: false });
  assert.equal((await denied.create(futureWindow())).status, 403);
  assert.equal(denied.state.saves, 0);
  const stranger = routeHarness({ owner: otherId });
  assert.equal((await stranger.create(futureWindow())).status, 403);
  assert.equal(stranger.state.saves, 0);
  const archived = routeHarness(); archived.state.trackStatus = "ARCHIVED";
  assert.equal((await archived.create(futureWindow())).status, 403);
});

test("replacing a track campaign increments its version and keeps one record", async () => {
  const harness = routeHarness();
  const created = await harness.create(futureWindow());
  assert.equal(created.status, 201);
  assert.equal((await created.json()).discount.version, 1);
  const replaced = await harness.create({ ...futureWindow(), percentage: 30 });
  assert.equal(replaced.status, 200);
  const result = await replaced.json();
  assert.equal(result.discount.percentage, 30);
  assert.equal(result.discount.version, 2);
  assert.equal(harness.state.rows.length, 1);
  assert.equal(result.discount.producerId, undefined);
});

test("promotion edits and cancellation scope every query to the producer owner", async () => {
  const harness = routeHarness();
  await harness.create(futureWindow());
  assert.equal((await harness.patch({ percentage: 35 })).status, 200);
  assert.equal(harness.state.rows[0].version, 2);
  assert.equal((await harness.remove()).status, 200);
  assert.equal(harness.state.rows[0].isActive, false);
  assert.equal(harness.state.rows[0].version, 3);
  assert.equal((await harness.remove()).status, 200);
  assert.equal(harness.state.rows[0].version, 3);
  for (const filter of harness.state.finds.filter((filter) => filter._id)) assert.equal(filter.producerId, producerId);
  harness.state.rows[0].producerId = otherId;
  assert.equal((await harness.patch({ percentage: 40 })).status, 404);
  assert.equal((await harness.remove()).status, 404);
});
