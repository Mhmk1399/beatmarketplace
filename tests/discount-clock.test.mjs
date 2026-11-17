import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScript } from "./load-typescript.mjs";

function clockHarness(t) {
  let monotonic = 100;
  let wallClock = Date.parse("2030-01-01T00:00:00Z");
  let sequence = 0;
  const tasks = new Map();
  const events = new Map();
  const snapshots = [];
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  const performanceDescriptor = Object.getOwnPropertyDescriptor(globalThis, "performance");
  const document = { hidden: false, addEventListener: (name, listener) => events.set(name, listener), removeEventListener: (name) => events.delete(name) };
  Object.defineProperty(globalThis, "document", { value: document, configurable: true });
  Object.defineProperty(globalThis, "performance", { value: { now: () => monotonic }, configurable: true });
  t.mock.method(Date, "now", () => wallClock);
  t.mock.method(globalThis, "setTimeout", (callback) => { const id = ++sequence; tasks.set(id, callback); return id; });
  t.mock.method(globalThis, "clearTimeout", (id) => tasks.delete(id));
  t.after(() => {
    if (documentDescriptor) Object.defineProperty(globalThis, "document", documentDescriptor); else delete globalThis.document;
    Object.defineProperty(globalThis, "performance", performanceDescriptor);
  });
  const pricing = loadTypeScript(new URL("../lib/marketplace/discounts.ts", import.meta.url));
  const clock = loadTypeScript(new URL("../components/discounts/clock.ts", import.meta.url), {
    react: { useCallback: (callback) => callback, useSyncExternalStore: (subscribe, snapshot) => { snapshots.push({ subscribe, snapshot }); return snapshot(); } },
    "@/lib/marketplace/discounts": pricing,
  });
  return { clock, document, tasks, events, snapshots, advance: (milliseconds) => { monotonic += milliseconds; }, changeWallClock: (milliseconds) => { wallClock += milliseconds; }, tick: () => { const [id, task] = tasks.entries().next().value; tasks.delete(id); task(); } };
}

test("all countdown subscribers share one timer and release it when no offers remain", (t) => {
  const harness = clockHarness(t);
  harness.clock.useDiscountSecond();
  const { subscribe } = harness.snapshots[0];
  let notifications = 0;
  const unsubscribers = Array.from({ length: 40 }, () => subscribe(() => { notifications++; }));
  assert.equal(harness.tasks.size, 1);
  assert.equal(harness.events.size, 1);
  harness.advance(1000); harness.tick();
  assert.equal(notifications, 40);
  assert.equal(harness.tasks.size, 1);
  unsubscribers.forEach((unsubscribe) => unsubscribe());
  assert.equal(harness.tasks.size, 0);
  assert.equal(harness.events.size, 0);
});

test("server-synchronized countdowns use elapsed monotonic time rather than edited device clocks", (t) => {
  const harness = clockHarness(t);
  const timestamp = Date.parse("2027-06-01T12:00:00Z");
  harness.clock.synchronizeDiscountClock(new Date(timestamp).toISOString());
  assert.equal(harness.clock.discountNow(), timestamp);
  harness.changeWallClock(365 * 86400000);
  harness.advance(1750);
  assert.equal(harness.clock.discountNow(), timestamp + 1750);
  harness.clock.synchronizeDiscountClock("not-a-date");
  assert.equal(harness.clock.discountNow(), timestamp + 1750);
});

test("hidden tabs stop timers and refresh expired offers immediately when visible again", (t) => {
  const harness = clockHarness(t);
  const timestamp = Date.parse("2027-06-01T12:00:00Z");
  harness.clock.synchronizeDiscountClock(new Date(timestamp).toISOString());
  const offer = { percentage: 25, isActive: true, startsAt: new Date(timestamp + 1000).toISOString(), endsAt: new Date(timestamp + 3000).toISOString() };
  assert.equal(harness.clock.useDiscountWindowSignature([offer]), "SCHEDULED");
  const { subscribe, snapshot } = harness.snapshots[0];
  let notifications = 0;
  const unsubscribe = subscribe(() => { notifications++; });
  harness.document.hidden = true; harness.events.get("visibilitychange")();
  assert.equal(harness.tasks.size, 0);
  harness.advance(5000);
  harness.document.hidden = false; harness.events.get("visibilitychange")();
  assert.equal(snapshot(), "EXPIRED");
  assert.equal(notifications, 1);
  assert.equal(harness.tasks.size, 1);
  unsubscribe();
});
