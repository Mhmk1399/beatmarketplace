// Read-only bounded HTTP benchmark; never creates users, tracks, files or orders.
import { performance } from "node:perf_hooks";

const base = new URL(process.env.BENCHMARK_URL || "http://localhost:3000");
if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) throw new Error("Use an HTTP(S) application URL without credentials.");
const integer = (value, fallback, maximum) => {
  const result = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(result) || result < 1 || result > maximum) throw new Error(`Use a whole value between 1 and ${maximum}.`);
  return result;
};
const requests = integer(process.env.BENCHMARK_REQUESTS, 100, 1000);
const concurrency = integer(process.env.BENCHMARK_CONCURRENCY, 8, 16);
const pages = integer(process.env.BENCHMARK_PAGES, 10, 100);
const latencies = [];
const failures = [];
let started = 0;

async function page(cursor = "") {
  const url = new URL("/api/tracks", base);
  url.search = new URLSearchParams({ pagination: "cursor", pageSize: "24", sort: "newest", ...(cursor ? { cursor } : {}) }).toString();
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Catalog returned HTTP ${response.status}.`);
  return response.json();
}

await Promise.all(Array.from({ length: Math.min(concurrency, requests) }, async () => {
  while (started < requests) {
    const index = started++;
    const begin = performance.now();
    try { await page(); latencies.push(performance.now() - begin); }
    catch (error) { failures.push({ request: index + 1, error: error instanceof Error ? error.message : "Request failed." }); }
  }
}));

const ids = new Set();
let cursor = "";
let pagesRead = 0;
let duplicates = 0;
try {
  for (let index = 0; index < pages; index++) {
    const result = await page(cursor);
    pagesRead++;
    for (const track of result.tracks) { if (ids.has(track.id)) duplicates++; ids.add(track.id); }
    if (!result.hasMore || !result.nextCursor) break;
    cursor = result.nextCursor;
  }
} catch (error) { failures.push({ cursorPage: pagesRead + 1, error: error instanceof Error ? error.message : "Page failed." }); }

latencies.sort((a, b) => a - b);
const percentile = (fraction) => latencies.length ? Math.round(latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * fraction))] * 100) / 100 : null;
process.stdout.write(`${JSON.stringify({ origin: base.origin, requests, concurrency, successes: latencies.length, failures, p50Ms: percentile(.5), p95Ms: percentile(.95), pagesRead, uniqueTracks: ids.size, duplicates,
  scope: "Bounded HTTP metadata benchmark. It does not establish production storage or payment capacity." }, null, 2)}\n`);
if (failures.length || duplicates) process.exitCode = 1;
