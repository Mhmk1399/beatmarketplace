import assert from "node:assert/strict";
import { test } from "node:test";
import { UploadProgressDecoder, UPLOAD_PROGRESS_TYPE, type UploadStage } from "../lib/uploads/protocol";
import { trackUploadResponse } from "../lib/uploads/server-progress";
import { trackUploadIdentity } from "../lib/uploads/identity";
import { UploadSubmission } from "../lib/uploads/submission";
import { uploadRequest, type UploadTransferProgress } from "../lib/uploads/transport";

const identity = "00000000-0000-4000-8000-000000000001";
test("split progress frames preserve real stages and an error result is not success", () => {
  const stages: UploadStage[] = [], decoder = new UploadProgressDecoder(stage => stages.push(stage));
  const frames = '{"type":"heartbeat"}\n{"type":"progress","stage":"validating"}\n{"type":"progress","stage":"previewing"}\n{"type":"result","status":503,"body":{"error":"Preparation failed"}}\n';
  for (const character of frames) decoder.push(character);
  assert.deepEqual(stages, ["validating", "previewing"]);
  assert.deepEqual(decoder.finish(), { status: 503, body: { error: "Preparation failed" } });
  assert.throws(() => decoder.push('{"type":"heartbeat"}\n'), /Unexpected data/);
  const interrupted = new UploadProgressDecoder(() => {});
  interrupted.push('{"type":"progress","stage":"saving"}\n');
  assert.throws(() => interrupted.finish(), /interrupted/);
  assert.throws(() => new UploadProgressDecoder(() => {}).push('{"type":"progress","stage":"fake-stage"}\n'), /Invalid upload/);
});

test("streamed requests receive progress before completion and keep errors in terminal results", async () => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const request = new Request("http://localhost/upload", { headers: { Accept: UPLOAD_PROGRESS_TYPE } });
  const response = await trackUploadResponse(request, async report => {
    report("validating"); await barrier; report("previewing");
    throw new Error("encoder failure");
  }, () => Response.json({ error: "Preparation failed" }, { status: 503 }));
  assert.equal(response.headers.get("cache-control"), "private, no-store, no-transform");
  assert.equal(response.headers.get("x-accel-buffering"), "no");
  const reader = response.body!.getReader();
  const first = await reader.read();
  assert.match(new TextDecoder().decode(first.value), /validating/);
  release(); let rest = "";
  while (true) { const chunk = await reader.read(); if (chunk.done) break; rest += new TextDecoder().decode(chunk.value); }
  assert.match(rest, /previewing/); assert.match(rest, /"status":503/);
  assert.ok(!rest.includes("encoder failure"));
  const plain = await trackUploadResponse(new Request("http://localhost/upload"), async () => Response.json({ ok: true }, { status: 201 }), () => Response.json({}, { status: 503 }));
  assert.equal(plain.status, 201); assert.deepEqual(await plain.json(), { ok: true });
});

test("unchanged retries reuse identity, edits get a new one, and actors cannot share a track ID", () => {
  let count = 0;
  const submission = new UploadSubmission(() => `request-${++count}`);
  const file = {}, snapshot = { url: "/api/tracks", method: "POST", data: '{"title":"Beat"}', master: file, artwork: null };
  const first = submission.identify(snapshot);
  assert.equal(submission.identify({ ...snapshot }), first);
  assert.notEqual(submission.identify({ ...snapshot, data: '{"title":"Edited"}' }), first);
  const second = submission.identify(snapshot);
  assert.notEqual(submission.identify({ ...snapshot, master: {} }), second);
  assert.match(trackUploadIdentity("producer-a", identity)!, /^[a-f0-9]{24}$/);
  assert.equal(trackUploadIdentity("producer-a", identity), trackUploadIdentity("producer-a", identity));
  assert.notEqual(trackUploadIdentity("producer-a", identity), trackUploadIdentity("producer-b", identity));
  assert.equal(trackUploadIdentity("producer-a", null), null);
  assert.throws(() => trackUploadIdentity("producer-a", "invalid"), /Invalid upload/);
});

class FakeXHR {
  static latest: FakeXHR;
  upload: { onprogress: ((event: { loaded: number; total: number; lengthComputable: boolean }) => void) | null; onload: (() => void) | null } = { onprogress: null, onload: null };
  onload: (() => void) | null = null; onerror: (() => void) | null = null; onabort: (() => void) | null = null; ontimeout: (() => void) | null = null; onprogress: (() => void) | null = null;
  status = 200; statusText = "OK"; responseText = ""; withCredentials = false;
  type = UPLOAD_PROGRESS_TYPE;
  headers = new Map<string, string>();
  constructor() { FakeXHR.latest = this; }
  open() {} send() {} abort() { this.onabort?.(); }
  setRequestHeader(key: string, value: string) { this.headers.set(key.toLowerCase(), value); }
  getResponseHeader(name: string) { return name.toLowerCase() === "content-type" ? this.type : null; }
  getAllResponseHeaders() { return `Content-Type: ${this.type}\r\n`; }
}

test("XHR reports real server stages, rejects a missing result, and preserves cancellation", async () => {
  const original = globalThis.XMLHttpRequest;
  Object.defineProperty(globalThis, "XMLHttpRequest", { configurable: true, writable: true, value: FakeXHR });
  try {
    const events: UploadTransferProgress[] = [];
    const form = new FormData(); form.set("data", "{}");
    const controller = new AbortController();
    const promise = uploadRequest("http://localhost/upload", { method: "POST", body: form, headers: { Accept: UPLOAD_PROGRESS_TYPE, "X-Upload-Request-Id": identity } }, controller.signal, event => events.push(event));
    const xhr = FakeXHR.latest;
    xhr.upload.onprogress?.({ loaded: 50, total: 100, lengthComputable: true }); xhr.upload.onload?.();
    xhr.responseText = '{"type":"progress","stage":"previewing"}\n'; xhr.onprogress?.();
    assert.equal(events.at(-1)?.stage, "previewing"); assert.equal(events.at(-1)?.percent, null);
    xhr.responseText += '{"type":"result","status":503,"body":{"error":"Preparation failed"}}\n'; xhr.onload?.();
    const response = await promise;
    assert.equal(response.status, 503); assert.deepEqual(await response.json(), { error: "Preparation failed" });
    assert.equal(xhr.headers.get("x-upload-request-id"), identity);
    const interrupted = uploadRequest("http://localhost/upload", { body: form }, new AbortController().signal, () => {});
    FakeXHR.latest.responseText = '{"type":"progress","stage":"saving"}\n'; FakeXHR.latest.onload?.();
    await assert.rejects(interrupted, /interrupted/);
    const cancellation = new AbortController();
    const cancelled = uploadRequest("http://localhost/upload", { body: form }, cancellation.signal, () => {});
    cancellation.abort(); await assert.rejects(cancelled, { name: "AbortError" });
    assert.equal(FakeXHR.latest.onprogress, null);
  } finally {
    if (original === undefined) Reflect.deleteProperty(globalThis, "XMLHttpRequest");
    else Object.defineProperty(globalThis, "XMLHttpRequest", { configurable: true, writable: true, value: original });
  }
});
