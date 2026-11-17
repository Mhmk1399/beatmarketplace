import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { NextResponse } from "next/server.js";
import { loadTypeScript } from "./load-typescript.mjs";

const marketplaceValidation = loadTypeScript(new URL("../lib/marketplace/validation.ts", import.meta.url));
const validation = loadTypeScript(new URL("../lib/hero/validation.ts", import.meta.url), { "@/lib/marketplace/validation": marketplaceValidation });
const adminId = "111111111111111111111111";
const trackId = "222222222222222222222222";
const otherTrackId = "333333333333333333333333";
const placementId = "444444444444444444444444";
const startsAt = "2030-01-01T10:00:00.000Z";
const endsAt = "2030-01-01T11:00:00.000Z";
const valid = { trackId, position: 2, startsAt, endsAt, paymentStatus: "PAID", agreedFeeToman: 100_000 };

test("hero input uses zoned dates, bounded integer toman fees and strict administration fields", () => {
  assert.equal(validation.heroCreateSchema.safeParse(valid).success, true);
  for (const patch of [{ trackId: "bad" }, { position: -1 }, { position: 1.2 }, { agreedFeeToman: 1.1 }, { agreedFeeToman: 1_000_000_001 }, { agreedFeeToman: "1000" }, { paymentStatus: "VERIFIED_BY_GATEWAY" }, { startsAt: "2030-01-01T10:00" }, { createdBy: adminId }]) {
    assert.equal(validation.heroCreateSchema.safeParse({ ...valid, ...patch }).success, false);
  }
  assert.equal(validation.heroPatchSchema.safeParse({ expectedVersion: 1 }).success, false);
  assert.equal(validation.heroPatchSchema.safeParse({ expectedVersion: 0, label: "Feature" }).success, false);
  for (const query of [{ page: 1001 }, { pageSize: 49 }, { page: -1 }]) assert.equal(validation.heroQuerySchema.safeParse(query).success, false);
});

test("hero windows, manual paid fees and start-inclusive/end-exclusive eligibility are explicit", () => {
  const booking = { startsAt: new Date(startsAt), endsAt: new Date(endsAt), isActive: true, paymentStatus: "PAID", agreedFeeToman: 1000 };
  assert.equal(validation.validateHeroBooking(booking, new Date(startsAt)), null);
  assert.match(validation.validateHeroBooking({ ...booking, agreedFeeToman: 0 }, new Date(startsAt)), /positive/);
  assert.match(validation.validateHeroBooking({ ...booking, endsAt: new Date(startsAt) }, new Date(startsAt)), /after/);
  assert.match(validation.validateHeroBooking({ ...booking, endsAt: new Date(Date.parse(startsAt) + 367 * 86400_000) }, new Date(startsAt)), /366/);
  assert.match(validation.validateHeroBooking(booking, new Date(endsAt)), /future/);
  assert.equal(validation.validateHeroBooking(booking, new Date(endsAt), false), null, "historic bookkeeping does not reopen an expired campaign");
  assert.equal(validation.heroPlacementIsLive(booking, Date.parse(startsAt) - 1), false);
  assert.equal(validation.heroPlacementIsLive(booking, Date.parse(startsAt)), true);
  assert.equal(validation.heroPlacementIsLive(booking, Date.parse(endsAt)), false);
  assert.equal(validation.heroPlacementIsLive({ ...booking, paymentStatus: "PENDING" }, Date.parse(startsAt)), false);
  assert.equal(validation.heroPlacementIsLive({ ...booking, paymentStatus: "COMPLIMENTARY" }, Date.parse(startsAt)), true);
  assert.equal(validation.heroPlacementIsLive({ ...booking, isActive: false }, Date.parse(startsAt)), false);
});

function harness({ authorized = true, available = true } = {}) {
  const state = { rows: [], reads: 0, saves: 0, eligibility: [], available };
  class Placement {
    constructor(values) { Object.assign(this, { _id: new mongoose.Types.ObjectId(placementId), version: 1, isActive: true, label: "Featured", position: 0, agreedFeeToman: 0, paymentStatus: "PENDING", paymentReference: "", createdAt: new Date(startsAt), updatedAt: new Date(startsAt) }, values); }
    async save() { state.saves++; if (!state.rows.includes(this)) state.rows.push(this); return this; }
    static async create(values) { return new Placement(values).save(); }
    static async findById(id) { state.reads++; return state.rows.find((row) => String(row._id) === id) ?? null; }
    static find() { state.reads++; const query = { sort: () => query, skip: (skip) => { query.skipCount = skip; return query; }, limit: async (limit) => state.rows.slice(query.skipCount, query.skipCount + limit) }; return query; }
    static async countDocuments() { return state.rows.length; }
  }
  class MarketplaceError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
  const heroServer = {
    requireEligibleHeroTrack: async (id) => { state.eligibility.push(String(id)); if (!state.available) throw new MarketplaceError("Track unavailable.", 409); },
    serializeAdminHeroPlacements: async (rows) => rows.map((row) => ({ id: String(row._id), ...row, trackId: String(row.trackId) })),
  };
  const mocks = {
    "@/lib/hero/validation": validation,
    "@/lib/hero/server": heroServer,
    "@/lib/marketplace/validation": marketplaceValidation,
    "@/lib/marketplace/server": {
      MarketplaceError,
      requireMarketplaceRole: async (_request, role) => authorized && role === "ADMIN" ? { ok: true, user: { _id: new mongoose.Types.ObjectId(adminId), id: adminId } } : { ok: false, response: NextResponse.json({ error: "Admin access required." }, { status: 403 }) },
      marketplaceError: (error) => NextResponse.json({ error: error.message }, { status: error.status ?? 400 }),
    },
    "@/models/HeroPlacement": { __esModule: true, default: Placement },
  };
  const collection = loadTypeScript(new URL("../app/api/admin/hero/route.ts", import.meta.url), mocks);
  const detail = loadTypeScript(new URL("../app/api/admin/hero/[id]/route.ts", import.meta.url), mocks);
  return { state, Placement, collection, detail };
}
function request(method, data, query = "") { return new Request(`http://localhost/api/admin/hero${query}`, { method, ...(data === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }) }); }
const params = () => ({ params: Promise.resolve({ id: placementId }) });

test("hero administration rejects every non-admin action before reading or mutating bookings", async () => {
  const h = harness({ authorized: false });
  for (const result of [await h.collection.GET(request("GET")), await h.collection.POST(request("POST", valid)), await h.detail.PATCH(request("PATCH", { label: "Changed" }), params()), await h.detail.DELETE(request("DELETE"), params())]) assert.equal(result.status, 403);
  assert.equal(h.state.reads, 0); assert.equal(h.state.saves, 0); assert.deepEqual(h.state.eligibility, []);
});

test("booking creation defaults to pending manual payment and stamps the authenticated administrator", async () => {
  const h = harness();
  const result = await h.collection.POST(request("POST", { trackId, startsAt, endsAt }));
  assert.equal(result.status, 201); assert.equal(h.state.rows[0].paymentStatus, "PENDING"); assert.equal(h.state.rows[0].agreedFeeToman, 0);
  assert.equal(String(h.state.rows[0].createdBy), adminId); assert.equal(String(h.state.rows[0].updatedBy), adminId);
  assert.deepEqual(h.state.eligibility, [trackId]); assert.equal(h.state.saves, 1);
});

test("unavailable tracks and invalid paid fees cannot create a placement", async () => {
  const h = harness({ available: false });
  assert.equal((await h.collection.POST(request("POST", valid))).status, 409);
  assert.equal((await h.collection.POST(request("POST", { ...valid, agreedFeeToman: 0 }))).status, 400);
  assert.equal(h.state.saves, 0);
});

test("stale versions cannot alter a booking; historical metadata remains editable after track loss", async () => {
  const h = harness();
  const booking = new h.Placement({ ...valid, trackId: new mongoose.Types.ObjectId(trackId), startsAt: new Date(startsAt), endsAt: new Date(endsAt), version: 4, isActive: false });
  h.state.rows.push(booking); h.state.available = false;
  assert.equal((await h.detail.PATCH(request("PATCH", { label: "Stale", expectedVersion: 3 }), params())).status, 409);
  assert.equal(booking.label, "Featured"); assert.equal(h.state.saves, 0);
  assert.equal((await h.detail.PATCH(request("PATCH", { label: "Invoice reconciled", paymentReference: "manual-receipt-9", expectedVersion: 4 }), params())).status, 200);
  assert.equal(booking.version, 5); assert.equal(booking.label, "Invoice reconciled"); assert.deepEqual(h.state.eligibility, []);
  assert.equal((await h.detail.PATCH(request("PATCH", { isActive: true, expectedVersion: 5 }), params())).status, 409);
});

test("replacing tracks and enabling paid bookings recheck real track eligibility", async () => {
  const h = harness();
  const booking = new h.Placement({ ...valid, trackId: new mongoose.Types.ObjectId(trackId), startsAt: new Date(startsAt), endsAt: new Date(endsAt), paymentStatus: "PENDING" });
  h.state.rows.push(booking);
  assert.equal((await h.detail.PATCH(request("PATCH", { paymentStatus: "PAID", expectedVersion: 1 }), params())).status, 200);
  assert.deepEqual(h.state.eligibility, [trackId]);
  assert.equal((await h.detail.PATCH(request("PATCH", { trackId: otherTrackId, expectedVersion: 2 }), params())).status, 200);
  assert.deepEqual(h.state.eligibility, [trackId, otherTrackId]); assert.equal(String(booking.trackId), otherTrackId);
});

test("disabling remains idempotent without consulting a missing track or producer", async () => {
  const h = harness({ available: false });
  const booking = new h.Placement({ trackId: new mongoose.Types.ObjectId(trackId), startsAt: new Date(startsAt), endsAt: new Date(endsAt) }); h.state.rows.push(booking);
  assert.equal((await h.detail.DELETE(request("DELETE"), params())).status, 200);
  assert.equal(booking.isActive, false); assert.equal(booking.version, 2); assert.equal(h.state.saves, 1);
  assert.equal((await h.detail.DELETE(request("DELETE"), params())).status, 200);
  assert.equal(h.state.saves, 1); assert.deepEqual(h.state.eligibility, []);
});

test("admin pages are bounded and malformed pagination does not access booking records", async () => {
  const h = harness();
  for (let index = 0; index < 8; index++) h.state.rows.push(new h.Placement({ trackId, startsAt: new Date(startsAt), endsAt: new Date(endsAt) }));
  assert.equal((await h.collection.GET(request("GET", undefined, "?pageSize=1000"))).status, 400); assert.equal(h.state.reads, 0);
  const response = await h.collection.GET(request("GET", undefined, "?page=2&pageSize=3"));
  const data = await response.json(); assert.equal(data.placements.length, 3); assert.equal(data.total, 8); assert.equal(data.hasMore, true);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("public hero serialization excludes fees/admin identities and retains a valid 13th license", async () => {
  const license = { _id: "555555555555555555555555", price: { toString: () => "100000" } };
  const discount = { id: "offer", percentage: 25 };
  const track = { id: trackId, title: "A real beat", licenses: Array.from({ length: 12 }, (_, index) => ({ id: String(index), licenseType: "EXCLUSIVE" })), discount };
  const row = { _id: placementId, trackId, label: "Selected", position: 2, startsAt: new Date(startsAt), endsAt: new Date(endsAt), agreedFeeToman: 999999, paymentReference: "private receipt", createdBy: adminId, __heroLicense: [license] };
  let injectedDiscount;
  const server = loadTypeScript(new URL("../lib/hero/server.ts", import.meta.url), {
    "@/lib/hero/validation": validation,
    "@/lib/marketplace/server": { publicTrackFilter: { status: "PUBLISHED", visibility: "PUBLIC" }, activeContractFilter: () => ({ isActive: true }), MarketplaceError: class extends Error {}, serializeTracks: async () => [track], serializeLicense: (value, offer) => { injectedDiscount = offer; return { id: value._id, licenseType: "NON_EXCLUSIVE", formats: ["WAV"], price: "75000" }; } },
    "@/models/HeroPlacement": { __esModule: true, default: { aggregate: () => ({ option: async () => [row] }) } },
    "@/models/Track": { __esModule: true, default: { collection: { name: "tracks" }, find: async () => [{}] } },
    "@/models/Contract": { __esModule: true, default: { collection: { name: "contracts" } } },
    "@/models/User": { __esModule: true, default: { collection: { name: "users" } } },
    "@/models/ProducerProfile": { __esModule: true, default: {} },
  });
  const [placement] = await server.publicHeroPlacements(new Date(startsAt));
  assert.deepEqual(Object.keys(placement).sort(), ["id", "track", "position", "label", "startsAt", "endsAt", "sponsored"].sort());
  assert.equal(placement.sponsored, true); assert.equal(placement.track.licenses.length, 12); assert.equal(placement.track.licenses[0].id, license._id); assert.equal(placement.track.licenses[0].price, "75000"); assert.equal(injectedDiscount, discount);
  assert.equal(JSON.stringify(placement).includes("private receipt"), false);
});
