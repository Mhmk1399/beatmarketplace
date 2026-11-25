import assert from "node:assert/strict";
import test from "node:test";

import { MAX_SALES_EXPORT_ORDERS, safeCsvCell, salesExportExceedsLimit } from "../lib/workspace/csv";

test("CSV cells escape quotes, commas and spreadsheet formulas", () => {
  assert.equal(safeCsvCell('Beat, "Deluxe"'), '"Beat, ""Deluxe"""');
  assert.equal(safeCsvCell("=HYPERLINK(\"https://example.test\")"), '"\'=HYPERLINK(""https://example.test"")"');
  assert.equal(safeCsvCell("  +SUM(1,2)"), '"\'  +SUM(1,2)"');
  assert.equal(safeCsvCell(125000), '"125000"');
});

test("sales export overflow is detected instead of silently truncated", () => {
  assert.equal(salesExportExceedsLimit(MAX_SALES_EXPORT_ORDERS), false);
  assert.equal(salesExportExceedsLimit(MAX_SALES_EXPORT_ORDERS + 1), true);
});
