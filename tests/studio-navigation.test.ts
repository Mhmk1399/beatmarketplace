import assert from "node:assert/strict";
import test from "node:test";
import { getNavigation } from "../lib/dashboard/navigation";

test("producer navigation registers the complete grouped workspace without duplicate routes", () => {
  const sections = getNavigation("producer");
  assert.deepEqual(sections.map(section => section.label).filter(Boolean), ["Catalog", "Selling", "Content", "Marketing", "Rights", "Business", "Account"]);
  const items = sections.flatMap(section => section.items);
  assert.equal(new Set(items.map(item => item.href)).size, items.length);
  for (const href of ["/studio/files", "/studio/tracklists", "/studio/collections", "/studio/sound-kits", "/studio/services", "/studio/videos", "/studio/photos", "/studio/promote", "/studio/pro-page", "/studio/publishing", "/studio/beat-id", "/studio/cra", "/studio/finances", "/studio/integrations", "/studio/promote-credits"]) assert.ok(items.some(item => item.href === href), href);
  assert.equal(items.find(item => item.href === "/studio/promote")?.availability, "limited");
  assert.ok(items.filter(item => item.availability === "coming-soon").every(item => item.badge === "Soon"));
});
