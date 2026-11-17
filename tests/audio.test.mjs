import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScript } from "./load-typescript.mjs";

const { adjacentIndex, buildQueue, clamp, formatAudioTime, mediaErrorMessage, trackDuration, uniqueQueue } = loadTypeScript(new URL("../lib/audio/utils.ts", import.meta.url));
const song = (id, extra = {}) => ({ id, title: id, artist: "Demo", src: `/assets/audios/${id}.mp3`, coverUrl: null, description: "Test track", ...extra });

test("marketplace playback stays capped while local demo music uses its real full duration", () => {
  assert.equal(trackDuration(song("preview", { durationLimitSeconds: 30 }), 215.3), 30);
  assert.equal(trackDuration(song("preview", { durationLimitSeconds: 30 }), 18), 18);
  assert.equal(trackDuration(song("preview", { durationLimitSeconds: 30 }), NaN), 30);
  assert.equal(trackDuration(song("demo", { isDemo: true }), 215.3), 215.3);
  assert.equal(trackDuration(song("demo"), Infinity), 0);
  assert.equal(trackDuration(song("bad-limit", { durationLimitSeconds: -1 }), 40), 40);
});

test("seeking and volume cannot introduce negative, excessive or nonfinite values", () => {
  assert.equal(clamp(-10, 0, 30), 0);
  assert.equal(clamp(90, 0, 30), 30);
  assert.equal(clamp(NaN, 0, 30), 0);
  assert.equal(clamp(Infinity, 0, 1), 0);
  assert.equal(clamp(0.35, 0, 1), 0.35);
});

test("queue construction preserves an album order, updates the chosen source and never duplicates a track", () => {
  const supplied = [song("a"), song("b"), song("a"), song("c")];
  const current = song("b", { src: "/new-preview.wav", durationLimitSeconds: 30 });
  const queue = buildQueue(current, supplied);
  assert.deepEqual(queue.map((item) => item.id), ["a", "b", "c"]);
  assert.equal(queue[1], current);
  assert.equal(supplied[1].src, "/assets/audios/b.mp3");
});

test("playing another site's beat without an explicit queue retains the session queue", () => {
  const queue = buildQueue(song("new"), undefined, [song("a"), song("b")]);
  assert.deepEqual(queue.map((item) => item.id), ["a", "b", "new"]);
  assert.deepEqual(buildQueue(song("only")).map((item) => item.id), ["only"]);
});

test("queue limits retain the newly selected track even when the existing queue is full", () => {
  const old = Array.from({ length: 220 }, (_, index) => song(String(index)));
  assert.equal(uniqueQueue(old).length, 200);
  const queue = buildQueue(song("chosen"), undefined, old);
  assert.equal(queue.length, 200);
  assert.equal(queue.at(-1).id, "chosen");
  assert.equal(uniqueQueue([song("a"), song("empty", { src: "" })]).length, 1);
});

test("repeat-off reaches the queue boundary and repeat-all wraps in either direction", () => {
  assert.equal(adjacentIndex(3, 2, 1, "off", false), -1);
  assert.equal(adjacentIndex(3, 0, -1, "off", false), -1);
  assert.equal(adjacentIndex(3, 2, 1, "all", false), 0);
  assert.equal(adjacentIndex(3, 0, -1, "all", false), 2);
  assert.equal(adjacentIndex(3, 0, 1, "one", false), 1);
  assert.equal(adjacentIndex(1, 0, 1, "all", false), -1);
});

test("shuffle chooses another valid track even at random-number bounds", () => {
  for (const index of [0, 1, 2, 3]) {
    for (const random of [0, 0.2, 0.5, 0.999999, 1]) {
      const next = adjacentIndex(4, index, 1, "all", true, random);
      assert.notEqual(next, index);
      assert.ok(next >= 0 && next < 4);
    }
  }
});

test("unknown/loading duration and malformed metadata produce readable timestamps", () => {
  assert.equal(formatAudioTime(NaN), "0:00");
  assert.equal(formatAudioTime(-20), "0:00");
  assert.equal(formatAudioTime(59.99), "0:59");
  assert.equal(formatAudioTime(225), "3:45");
});

test("network, decoder and unsupported source failures give distinct recovery guidance", () => {
  assert.match(mediaErrorMessage(2), /connection/);
  assert.match(mediaErrorMessage(3), /decoded/);
  assert.match(mediaErrorMessage(4), /unsupported/);
  assert.match(mediaErrorMessage(), /try again/);
});
