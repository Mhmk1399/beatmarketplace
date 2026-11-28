import assert from "node:assert/strict";
import { test } from "node:test";
import { producerSaleShare, splitSale } from "../lib/payments/splits";

test("split uses accepted shares and allocates the whole discounted price", () => {
  const result = splitSale("owner", 10001, [
    { userId: "accepted", status: "ACCEPTED", revenueSharePercentage: 25 },
    { userId: "pending", status: "PENDING", revenueSharePercentage: 25 },
    { userId: "declined", status: "DECLINED", revenueSharePercentage: 25 },
  ]);
  assert.deepEqual(result, [
    { userId: "owner", amount: 7501 },
    { userId: "accepted", amount: 2500 },
  ]);
  assert.deepEqual(splitSale("owner", 10001, []), [{ userId: "owner", amount: 10001 }]);
});

test("owner and collaborator see their own sale shares, with a legacy owner fallback", () => {
  const item = { producerId: "owner", price: 10001, revenueAllocations: [
    { userId: "owner", amount: 7501 }, { userId: "collaborator", amount: 2500 },
  ] };
  assert.equal(producerSaleShare(item, "owner"), 7501);
  assert.equal(producerSaleShare(item, "collaborator"), 2500);
  assert.equal(producerSaleShare(item, "unrelated"), undefined);
  assert.equal(producerSaleShare({ producerId: "owner", price: 10001 }, "owner"), 10001);
});
