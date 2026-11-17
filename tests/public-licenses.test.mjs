import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScript } from "./load-typescript.mjs";

const validation = loadTypeScript(new URL("../lib/marketplace/validation.ts", import.meta.url));
const legacyValidation = loadTypeScript(new URL("../lib/validation.ts", import.meta.url));
const helpers = loadTypeScript(new URL("../lib/marketplace/discounts.ts", import.meta.url));
const discountServer = loadTypeScript(new URL("../lib/marketplace/discount-server.ts", import.meta.url));
const marketplace = loadTypeScript(new URL("../lib/marketplace/server.ts", import.meta.url), {
  "@/lib/auth": {}, "@/lib/validation": legacyValidation, "@/lib/media/upload": {},
  "@/models/Contract": {}, "@/models/Genre": {}, "@/models/ProducerProfile": {}, "@/models/User": {}, "@/models/Track": {}, "@/models/TrackDiscount": {},
  "@/lib/marketplace/discounts": helpers, "@/lib/marketplace/discount-server": discountServer,
});
const trackId = "111111111111111111111111";
const producerId = "222222222222222222222222";

function harness({ count = 27, available = true } = {}) {
  const state = { filters: [], limits: [], sorts: [], queries: 0 };
  const records = Array.from({ length: count }, (_, index) => ({
    _id: String(index).padStart(24, "0"), title: `License ${index}`, price: { toString: () => String(100000 + index) }, currency: "IRT", version: 1,
    terms: { licenseType: "NON_EXCLUSIVE", distributionLimit: 5000, streamingLimit: 100000, customTerms: `Complete terms ${index}` }, filesToDeliver: [{ format: "WAV" }],
  }));
  const discount = { _id: "333333333333333333333333", trackId, producerId, percentage: 25, isActive: true, version: 2, startsAt: new Date(Date.now() - 60_000), endsAt: new Date(Date.now() + 60_000) };
  const route = loadTypeScript(new URL("../app/api/contracts/route.ts", import.meta.url), {
    "@/lib/db": { connectToDatabase: async () => undefined },
    "@/lib/marketplace/server": { ...marketplace, producerIsPublic: async () => available },
    "@/lib/marketplace/validation": validation, "@/lib/marketplace/discount-server": discountServer,
    "@/models/Track": { __esModule: true, default: { findOne: async () => available ? { _id: trackId, producerId } : null } },
    "@/models/TrackDiscount": { __esModule: true, default: { findOne: async () => discount } },
    "@/models/Contract": { __esModule: true, default: { find: (filter) => {
      state.queries++; state.filters.push(filter); let skip = 0;
      return { select() { return this; }, sort(value) { state.sorts.push(value); return this; }, skip(value) { skip = value; return this; }, async limit(value) { state.limits.push(value); return records.slice(skip, skip + value); } };
    } } },
  });
  return { state, get: (query = "") => route.GET(new Request(`https://beats.example/api/contracts?trackId=${trackId}${query}`)) };
}

test("public license pagination is bounded and returns every license once with full discounted terms", async () => {
  const service = harness();
  const first = await (await service.get("&page=1&pageSize=24")).json();
  const second = await (await service.get("&page=2&pageSize=24")).json();
  assert.equal(first.contracts.length, 24);
  assert.equal(first.hasMore, true);
  assert.equal(second.contracts.length, 3);
  assert.equal(second.hasMore, false);
  assert.equal(new Set([...first.contracts, ...second.contracts].map((item) => item.id)).size, 27);
  assert.equal(first.contracts[0].customTerms, "Complete terms 0");
  assert.equal(first.contracts[0].originalPrice, "100000");
  assert.equal(first.contracts[0].price, "75000");
  assert.equal(first.total, undefined);
  for (const filter of service.state.filters) {
    assert.equal(filter.producerId, producerId); assert.equal(filter.trackIds, trackId); assert.equal(filter.isActive, true); assert.equal(filter.currency, "IRT");
  }
  assert.deepEqual(service.state.limits, [25, 25]);
  assert.deepEqual(service.state.sorts, [{ price: 1, _id: 1 }, { price: 1, _id: 1 }]);
});

test("oversized or malformed public license pages are rejected before querying contracts", async () => {
  for (const query of ["&pageSize=25", "&pageSize=0", "&page=0", "&page=1001", "&page=1.5", "&pageSize=abc"]) {
    const service = harness();
    assert.equal((await service.get(query)).status, 400);
    assert.equal(service.state.queries, 0);
  }
});

test("unavailable public tracks cannot expose their contract pages", async () => {
  const service = harness({ available: false });
  assert.equal((await service.get()).status, 404);
  assert.equal(service.state.queries, 0);
});
