import assert from "node:assert/strict";
import test from "node:test";
import { producerPromotionDtos } from "../lib/workspace/producer-promotions";

test("producer promotion history omits placements for tracks outside the owned map", () => {
  const base = { label: "Featured", startsAt: new Date("2026-01-01"), endsAt: new Date("2026-02-01"), isActive: true, paymentStatus: "PAID", agreedFeeToman: 1000 };
  const result = producerPromotionDtos([{ ...base, _id: "owned-placement", trackId: "owned-track" }, { ...base, _id: "foreign-placement", trackId: "foreign-track" }], new Map([["owned-track", "Owned Beat"]]), new Date("2026-01-15").getTime());
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "owned-placement");
  assert.equal(result[0].trackTitle, "Owned Beat");
  assert.equal("paymentReference" in result[0], false);
});
