import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScript } from "./load-typescript.mjs";

const { PaymentError, gatewayOrigin, paymentConfiguration, requestPayment, verifyPayment } = loadTypeScript(new URL("../lib/payments/zarinpal.ts", import.meta.url));
const authority = `A${"0".repeat(35)}`;
const merchantId = "00000000-0000-0000-0000-000000000001";

function configure(t, overrides = {}) {
  const values = { NODE_ENV: "test", ZARINPAL_MERCHANT_ID: merchantId, APP_URL: "https://beats.example", ZARINPAL_SANDBOX: "true", ...overrides };
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
}

function mockGateway(t, data, status = 200) {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    requests.push({ url, body: JSON.parse(init.body), init });
    return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
  });
  return requests;
}

test("unconfigured payment and insecure production callback URLs fail before any gateway call", (t) => {
  configure(t, { ZARINPAL_MERCHANT_ID: undefined });
  assert.throws(paymentConfiguration, (error) => error instanceof PaymentError && error.status === 503);
  process.env.ZARINPAL_MERCHANT_ID = merchantId;
  process.env.NODE_ENV = "production";
  process.env.APP_URL = "http://beats.example";
  assert.throws(paymentConfiguration, (error) => error instanceof PaymentError && error.status === 503);
});

test("payment request sends the server amount in IRT with an origin-controlled callback", async (t) => {
  configure(t);
  const requests = mockGateway(t, { data: { code: 100, authority } });
  const payment = await requestPayment("order-123", 150_000, "buyer@example.test");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://sandbox.zarinpal.com/pg/v4/payment/request.json");
  assert.equal(requests[0].body.amount, 150_000);
  assert.equal(requests[0].body.currency, "IRT");
  assert.equal(requests[0].body.merchant_id, merchantId);
  assert.equal(requests[0].body.callback_url, "https://beats.example/api/payments/zarinpal/callback");
  assert.equal(requests[0].body.metadata.order_id, "order-123");
  assert.equal(payment.url, `https://sandbox.zarinpal.com/pg/StartPay/${authority}`);
  assert.equal(payment.mode, "sandbox");
  assert.equal(gatewayOrigin("live"), "https://payment.zarinpal.com");
});

test("gateway rejection and malformed authority never produce a checkout URL", async (t) => {
  configure(t);
  const responses = [{ data: { code: -9, authority } }, { data: { code: 100, authority: "https://attacker.example" } }, { errors: { code: -9 } }];
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify(responses.shift()), { status: 200 }));
  for (let index = 0; index < 3; index++) await assert.rejects(requestPayment("order", 150_000, "buyer@example.test"), (error) => error instanceof PaymentError);
});

test("verification accepts initial success and gateway-already-verified recovery with the stored amount", async (t) => {
  configure(t);
  const bodies = [];
  const codes = [100, 101];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    bodies.push({ url, body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ data: { code: codes.shift(), ref_id: 987654 } }), { status: 200 });
  });
  assert.equal(await verifyPayment(authority, 150_000, "sandbox"), "987654");
  assert.equal(await verifyPayment(authority, 150_000, "sandbox"), "987654");
  assert.equal(bodies.length, 2);
  for (const request of bodies) {
    assert.equal(request.url, "https://sandbox.zarinpal.com/pg/v4/payment/verify.json");
    assert.equal(request.body.amount, 150_000);
    assert.equal(request.body.authority, authority);
  }
});

test("unsuccessful gateway codes and missing verification references remain unverified", async (t) => {
  configure(t);
  const responses = [{ code: -51, ref_id: 987654 }, { code: 100 }, { code: 101, ref_id: null }, { code: "100", ref_id: 987654 }];
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ data: responses.shift() }), { status: 200 }));
  for (let index = 0; index < 4; index++) await assert.rejects(verifyPayment(authority, 150_000, "sandbox"), (error) => error instanceof PaymentError && error.status === 409);
});

test("a gateway HTTP outage does not become a successful payment", async (t) => {
  configure(t);
  mockGateway(t, { data: { code: 100, ref_id: 987654 } }, 503);
  await assert.rejects(verifyPayment(authority, 150_000, "sandbox"), (error) => error instanceof PaymentError && error.status === 502);
});

function callbackHarness({ status = "PENDING", failFirstWrite = false, verifyError = false, changeStatusBeforeWrite = null } = {}) {
  const storedOrder = { _id: "stored-order", authority, total: 150_000, gatewayMode: "sandbox", status };
  const state = { storedOrder, verifyCalls: [], updateCalls: [], successfulWrites: 0, databaseReads: 0, verifyError };
  const orderModel = {
    async findOne(filter) {
      state.databaseReads++;
      return filter.authority === authority ? { ...storedOrder } : null;
    },
    async updateOne(filter, update) {
      state.updateCalls.push({ filter, update });
      if (failFirstWrite) { failFirstWrite = false; throw new Error("simulated database interruption"); }
      if (changeStatusBeforeWrite) storedOrder.status = changeStatusBeforeWrite;
      if (filter.status !== storedOrder.status || filter.authority !== storedOrder.authority) return { matchedCount: 0 };
      Object.assign(storedOrder, update.$set);
      state.successfulWrites++;
      return { matchedCount: 1 };
    },
    async exists(filter) {
      return filter._id === storedOrder._id && filter.authority === storedOrder.authority && filter.status === storedOrder.status;
    },
  };
  const nextResponse = {
    redirect(url, statusCode) { return new Response(null, { status: statusCode, headers: { Location: url } }); },
    json(data, init) { return new Response(JSON.stringify(data), init); },
  };
  const callback = loadTypeScript(new URL("../app/api/payments/zarinpal/callback/route.ts", import.meta.url), {
    "next/server": { NextResponse: nextResponse },
    "@/lib/db": { connectToDatabase: async () => undefined },
    "@/lib/payments/zarinpal": {
      paymentConfiguration: () => ({ origin: "https://beats.example" }),
      verifyPayment: async (...args) => { state.verifyCalls.push(args); if (state.verifyError) throw new Error("unverified"); return "987654"; },
    },
    "@/models/Order": { __esModule: true, default: orderModel },
  });
  return { ...state, state, callback: (query) => callback.GET(new Request(`https://untrusted-host.example/api/payments/zarinpal/callback?${query}`)) };
}

test("callback status and amount query parameters alone cannot unlock an order", async () => {
  const harness = callbackHarness();
  const cancelled = await harness.callback(`Authority=${authority}&Status=NOK&amount=1`);
  assert.equal(cancelled.headers.get("Location"), "https://beats.example/dashboard/orders?payment=cancelled");
  assert.equal(harness.state.verifyCalls.length, 0);
  assert.equal(harness.state.storedOrder.status, "PENDING");
  const verified = await harness.callback(`Authority=${authority}&Status=OK&amount=1`);
  assert.equal(verified.headers.get("Location"), "https://beats.example/dashboard/orders?payment=verified");
  assert.deepEqual(harness.state.verifyCalls, [[authority, 150_000, "sandbox"]]);
  assert.equal(harness.state.storedOrder.status, "PAID");
});

test("a failed verification leaves the pending order safe to retry", async () => {
  const harness = callbackHarness({ verifyError: true });
  const failed = await harness.callback(`Authority=${authority}&Status=OK`);
  assert.equal(failed.headers.get("Location"), "https://beats.example/dashboard/orders?payment=unverified");
  assert.equal(harness.state.storedOrder.status, "PENDING");
  assert.equal(harness.state.successfulWrites, 0);
  harness.state.verifyError = false;
  const retry = await harness.callback(`Authority=${authority}&Status=OK`);
  assert.equal(retry.headers.get("Location"), "https://beats.example/dashboard/orders?payment=verified");
  assert.equal(harness.state.successfulWrites, 1);
});

test("interrupted database writes can recover without issuing duplicate fulfillment", async () => {
  const harness = callbackHarness({ failFirstWrite: true });
  const first = await harness.callback(`Authority=${authority}&Status=OK`);
  assert.equal(first.headers.get("Location"), "https://beats.example/dashboard/orders?payment=unverified");
  assert.equal(harness.state.storedOrder.status, "PENDING");
  const recovered = await harness.callback(`Authority=${authority}&Status=OK`);
  assert.equal(recovered.headers.get("Location"), "https://beats.example/dashboard/orders?payment=verified");
  assert.equal(harness.state.storedOrder.status, "PAID");
  assert.equal(harness.state.successfulWrites, 1);
  await harness.callback(`Authority=${authority}&Status=OK`);
  assert.equal(harness.state.verifyCalls.length, 2);
  assert.equal(harness.state.successfulWrites, 1);
});

test("concurrent duplicate callbacks produce only one pending-to-paid transition", async () => {
  const harness = callbackHarness();
  const responses = await Promise.all([harness.callback(`Authority=${authority}&Status=OK`), harness.callback(`Authority=${authority}&Status=OK`)]);
  for (const response of responses) assert.equal(response.headers.get("Location"), "https://beats.example/dashboard/orders?payment=verified");
  assert.equal(harness.state.storedOrder.status, "PAID");
  assert.equal(harness.state.successfulWrites, 1);
  for (const attempt of harness.state.updateCalls) assert.deepEqual(attempt.filter, { _id: "stored-order", status: "PENDING", authority });
});

test("callback never reports verified when its conditional update lost to a nonpaid state", async () => {
  const harness = callbackHarness({ changeStatusBeforeWrite: "CANCELLED" });
  const response = await harness.callback(`Authority=${authority}&Status=OK`);
  assert.equal(response.headers.get("Location"), "https://beats.example/dashboard/orders?payment=unverified");
  assert.equal(harness.state.storedOrder.status, "CANCELLED");
  assert.equal(harness.state.successfulWrites, 0);
});

test("cancelled orders and invalid authorities cannot be reopened by callbacks", async () => {
  const cancelled = callbackHarness({ status: "CANCELLED" });
  const response = await cancelled.callback(`Authority=${authority}&Status=OK`);
  assert.equal(response.headers.get("Location"), "https://beats.example/dashboard/orders?payment=invalid");
  assert.equal(cancelled.state.verifyCalls.length, 0);
  const invalid = callbackHarness();
  await invalid.callback("Authority=bad&Status=OK");
  assert.equal(invalid.state.databaseReads, 0);
  assert.equal(invalid.state.verifyCalls.length, 0);
});
