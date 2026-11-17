import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScript } from "./load-typescript.mjs";
const { encodeCatalogCursor, decodeCatalogCursor } = loadTypeScript(new URL("../lib/marketplace/pagination.ts", import.meta.url));

test("catalog range cursors retain both timestamp and ID for stable same-time ordering", () => {
  const cursor = { createdAt: "2026-11-17T10:20:30.123Z", id: "abcdef0123456789abcdef01" };
  assert.deepEqual(decodeCatalogCursor(encodeCatalogCursor(cursor)), cursor);
});
test("catalog cursor cannot supply query objects, invalid dates, paths or unbounded input", () => {
  for (const cursor of ["", "../media", "a".repeat(257), "not-json", encodeCatalogCursor({createdAt:"2026-02-30T00:00:00.000Z",id:"abcdef0123456789abcdef01"}),
    encodeCatalogCursor({createdAt:"2026-11-17T10:20:30.123Z",id:{$gt:""}})]) assert.throws(() => decodeCatalogCursor(cursor), /Invalid catalog cursor/);
});
