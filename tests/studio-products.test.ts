import assert from "node:assert/strict";
import test from "node:test";
import { productInput, validatedVideoProvider } from "../lib/studio/products";
const base = {
  title: "Item",
  description: "",
  status: "DRAFT" as const,
  trackIds: [],
  videoUrl: "",
  priceToman: null,
  assetName: "",
  assetMimeType: "",
  assetSizeBytes: null,
};
test("video URLs require safe canonical YouTube or Vimeo video paths", () => {
  assert.equal(
    validatedVideoProvider("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    "YOUTUBE",
  );
  assert.equal(validatedVideoProvider("https://vimeo.com/123456789"), "VIMEO");
  for (const value of [
    "http://youtu.be/dQw4w9WgXcQ",
    "https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com:444/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/channel/test",
    "https://vimeo.com/channels/staffpicks",
  ])
    assert.throws(() => validatedVideoProvider(value));
});
test("sound kit input accepts a positive server-checked price", () => {
  assert.equal(
    productInput("SOUND_KIT", {
      ...base,
      status: "PUBLISHED",
      priceToman: 1000,
    }).priceToman,
    1000,
  );
});
test("tracklists retain selected beat order", () => {
  const trackIds = ["aaaaaaaaaaaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbbbbbbbbbb"];
  assert.deepEqual(
    productInput("TRACKLIST", { ...base, trackIds }).trackIds,
    trackIds,
  );
});
