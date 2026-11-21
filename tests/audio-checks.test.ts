import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { ListeningMeasurement } from "../lib/audio/diagnostics";
import { checkAudioDelivery } from "../lib/audio/delivery-check";
import { previewDeliveryConfiguration } from "../lib/media/preview-cdn";

test("listening measurement separates startup from stalls and finishes once", () => {
  const measurement = new ListeningMeasurement(100);
  measurement.waiting(150); // Initial loading belongs to startup, not a buffering pause.
  measurement.playing(500);
  measurement.waiting(2000); measurement.waiting(2100);
  measurement.playing(3000); measurement.waiting(4000);
  const result = measurement.finish(5000, "cancelled", 3.5);
  assert.deepEqual(result, { outcome: "cancelled", startMs: 400, stalls: 2, bufferingMs: 2000, observedMs: 4900, positionSeconds: 3.5 });
  measurement.playing(6000); measurement.waiting(7000);
  assert.equal(measurement.finish(8000, "complete", 30), result);
  const failed = new ListeningMeasurement(0);
  assert.equal(failed.finish(25_000, "failed", 0).startMs, null);
});

test("preview delivery configuration defaults safely and rejects invalid edge settings", () => {
  const oldMode = process.env.MEDIA_PREVIEW_DELIVERY, oldBase = process.env.MEDIA_PREVIEW_CDN_BASE_URL;
  try {
    delete process.env.MEDIA_PREVIEW_DELIVERY;
    assert.equal(previewDeliveryConfiguration().mode, "cache");
    process.env.MEDIA_PREVIEW_DELIVERY = "typo";
    assert.throws(previewDeliveryConfiguration, /cache or cdn/);
    process.env.MEDIA_PREVIEW_DELIVERY = "cdn";
    for (const base of ["", "http://edge.example", "https://user:password@edge.example", "https://edge.example?token=secret", "https://edge.example/#fragment"]) {
      process.env.MEDIA_PREVIEW_CDN_BASE_URL = base;
      assert.throws(previewDeliveryConfiguration);
    }
    process.env.MEDIA_PREVIEW_CDN_BASE_URL = "https://edge.example/";
    assert.equal(previewDeliveryConfiguration().base?.href, "https://edge.example/");
  } finally {
    if (oldMode === undefined) delete process.env.MEDIA_PREVIEW_DELIVERY; else process.env.MEDIA_PREVIEW_DELIVERY = oldMode;
    if (oldBase === undefined) delete process.env.MEDIA_PREVIEW_CDN_BASE_URL; else process.env.MEDIA_PREVIEW_CDN_BASE_URL = oldBase;
  }
});

async function listen(server: Server) {
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
async function close(server: Server) {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

async function fixture(options: { cors?: boolean; masterRedirect?: boolean; anonymousStatus?: number } = {}) {
  const id = "00000000-0000-4000-8000-000000000001";
  const path = `/api/media/${id}.preview.mp3`;
  let masterRequests = 0;
  const methods: string[] = [];
  const edge = createServer((request, response) => {
    methods.push(request.method!);
    if (request.url?.includes("master.wav")) masterRequests++;
    response.writeHead(206, { "Content-Type": "audio/mpeg", "Content-Range": "bytes 0-1023/481070",
      "Cache-Control": "public, max-age=60", ...(options.cors === false ? {} : { "Access-Control-Allow-Origin": request.headers.origin! }) });
    response.end(Buffer.alloc(1024, 1));
  });
  const edgeOrigin = await listen(edge);
  const app = createServer((request, response) => {
    methods.push(request.method!);
    const url = new URL(request.url!, "http://localhost");
    if (url.pathname === "/api/tracks") {
      response.setHeader("Content-Type", "application/json"); response.end(JSON.stringify({ tracks: [{ previewUrl: path }] })); return;
    }
    if (url.pathname === path) {
      if (url.searchParams.get("quality") === "low") {
        response.setHeader("ETag", '"low-version"');
        if (request.headers["if-none-match"] === '"low-version"') { response.writeHead(304); response.end(); return; }
        response.writeHead(206, { "Content-Type": "audio/mpeg", "Content-Range": "bytes 0-1023/360803", "X-Audio-Quality": "96" });
        response.end(Buffer.alloc(1024, 2)); return;
      }
      response.writeHead(307, { Location: `${edgeOrigin}/assets/${id}.${options.masterRedirect ? "master.wav" : "preview.mp3"}` });
      response.end(); return;
    }
    if (url.pathname.startsWith("/api/orders/")) { response.writeHead(options.anonymousStatus ?? 401); response.end(); return; }
    response.writeHead(404); response.end();
  });
  const origin = await listen(app);
  return { origin, methods, masterRequests: () => masterRequests, close: async () => { await close(app); await close(edge); } };
}

test("deployment preflight checks range playback, CORS, data saver, revalidation and anonymous denial using read-only requests", async () => {
  const site = await fixture();
  try {
    const report = await checkAudioDelivery(site.origin);
    assert.equal(report.passed, true, JSON.stringify(report));
    assert.equal(report.checks.filter(check => check.status === "pass").length, 5);
    assert.ok(site.methods.every(method => method === "GET"));
    assert.ok(!JSON.stringify(report).includes(".preview.mp3"), "reports should not contain file locations");
  } finally { await site.close(); }
});

test("deployment preflight refuses redirects to full masters without requesting them", async () => {
  const site = await fixture({ masterRedirect: true });
  try {
    const report = await checkAudioDelivery(site.origin);
    assert.equal(report.passed, false);
    assert.equal(site.masterRequests(), 0);
    assert.ok(report.checks.some(check => check.status === "fail" && check.detail.includes("not followed")));
  } finally { await site.close(); }
});

test("deployment preflight detects missing edge CORS and exposed anonymous download routes", async () => {
  const site = await fixture({ cors: false, anonymousStatus: 200 });
  try {
    const report = await checkAudioDelivery(site.origin);
    assert.equal(report.passed, false);
    assert.ok(report.checks.some(check => check.status === "fail" && check.detail.includes("browser origin")));
    assert.ok(report.checks.some(check => check.name === "Anonymous original download" && check.status === "fail"));
  } finally { await site.close(); }
  await assert.rejects(checkAudioDelivery("https://user:password@example.test"), /credentials/);
  await assert.rejects(checkAudioDelivery("https://example.test/a-path"), /origin/);
});
