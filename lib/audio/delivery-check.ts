export type DeliveryCheck = { name: string; status: "pass" | "warn" | "fail"; detail: string };
export type DeliveryReport = { origin: string; checkedAt: string; passed: boolean; checks: DeliveryCheck[] };
const previewPath = /^\/api\/media\/[0-9a-f-]{36}\.preview\.mp3$/;
function local(url: URL) { return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname); }
function safeUrl(value: string) {
  const url = new URL(value);
  if (url.username || url.password || (url.protocol !== "https:" && !(url.protocol === "http:" && local(url)))) throw new Error("Use HTTPS, or HTTP on localhost, without embedded credentials.");
  return url;
}

/** Read-only preflight; only preview redirects are followed, never master files. */
export async function checkAudioDelivery(input: string): Promise<DeliveryReport> {
  const base = safeUrl(input), checks: DeliveryCheck[] = [];
  if (base.pathname !== "/" || base.search || base.hash) throw new Error("Supply the application origin without a path or query.");
  const add = (name: string, status: DeliveryCheck["status"], detail: string) => checks.push({ name, status, detail });
  const get = (url: string | URL, headers: Record<string, string> = {}) => fetch(url, {
    headers: { Origin: base.origin, ...headers }, redirect: "manual", signal: AbortSignal.timeout(15_000),
  });
  async function boundedBody(response: Response, max: number) {
    const reader = response.body?.getReader(); if (!reader) return new Uint8Array();
    const chunks: Uint8Array[] = []; let count = 0;
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        count += value.length; if (count > max) throw new Error("Response exceeded the diagnostic byte limit.");
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => undefined); }
    const all = new Uint8Array(count); let offset = 0;
    for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.length; }
    return all;
  }
  async function probe(path: string, low: boolean) {
    let url = new URL(path, base), response: Response | undefined;
    for (let redirects = 0; redirects <= 3; redirects++) {
      response = await get(url, { Range: "bytes=0-1023" });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get("location"); await response.body?.cancel();
      if (!location || redirects === 3) throw new Error("Preview redirect chain is invalid.");
      const next = safeUrl(new URL(location, url).href);
      if (!/\/[0-9a-f-]{36}\.preview\.mp3$/.test(next.pathname) || next.search || next.hash) throw new Error("Redirect was not an unsigned preview URL; it was not followed.");
      if (low) throw new Error("Data-saver requests must stay on application delivery.");
      url = next;
    }
    if (!response) throw new Error("No preview response.");
    const bytes = await boundedBody(response, 2048);
    if (response.status !== 206 || bytes.length !== 1024 || !/^bytes 0-1023\/\d+$/.test(response.headers.get("content-range") || "")) throw new Error("Preview byte-range playback is unavailable.");
    if (!/^audio\/(mpeg|mp3)(;|$)/i.test(response.headers.get("content-type") || "")) throw new Error("Preview response is not MP3 audio.");
    if (url.origin !== base.origin && !["*", base.origin].includes(response.headers.get("access-control-allow-origin") || "")) throw new Error("Preview host does not allow this application's browser origin.");
    if (low && response.headers.get("x-audio-quality") !== "96") throw new Error("The deployed app did not supply the 96 kbps version.");
    if (url.origin !== base.origin && /no-store|private/i.test(response.headers.get("cache-control") || "")) add("Edge cache policy", "warn", "The preview host disables shared caching; review its preview-only cache policy.");
    return { response, url };
  }
  try {
    const catalog = await get(new URL("/api/tracks?pageSize=8&pagination=cursor&sort=newest", base));
    const bytes = await boundedBody(catalog, 512_000);
    if (!catalog.ok) throw new Error("Public catalog is unavailable.");
    const data = JSON.parse(new TextDecoder().decode(bytes)) as { tracks?: { previewUrl?: unknown }[] };
    const track = data.tracks?.find(track => typeof track.previewUrl === "string" && previewPath.test(track.previewUrl));
    if (!track || typeof track.previewUrl !== "string") throw new Error("No published MP3 preview was found in the first catalog page.");
    add("Catalog", "pass", "A real published preview is available.");
    try { await probe(track.previewUrl, false); add("Standard preview", "pass", "MP3, partial requests and browser-origin access passed."); }
    catch (error) { add("Standard preview", "fail", error instanceof Error ? error.message : "Preview check failed."); }
    try {
      const lowPath = `${track.previewUrl}?quality=low`;
      const low = await probe(lowPath, true);
      add("Data saver", "pass", "96 kbps preview uses application delivery.");
      const etag = low.response.headers.get("etag");
      if (!etag) throw new Error("The preview has no cache validator.");
      const repeated = await get(new URL(lowPath, base), { "If-None-Match": etag });
      await repeated.body?.cancel();
      if (repeated.status !== 304) throw new Error("Conditional preview reuse did not return 304.");
      add("Preview revalidation", "pass", "The app validates cached preview reuse.");
    } catch (error) { add("Data saver/cache", "fail", error instanceof Error ? error.message : "Data-saver check failed."); }
    const anonymous = await get(new URL("/api/orders/000000000000000000000000/download?item=0", base));
    await anonymous.body?.cancel();
    add("Anonymous original download", [401, 403].includes(anonymous.status) ? "pass" : "fail", `Unauthenticated order download returned ${anonymous.status}.`);
  } catch (error) { add("Delivery preflight", "fail", error instanceof Error ? error.message : "Delivery preflight failed."); }
  return { origin: base.origin, checkedAt: new Date().toISOString(), passed: !checks.some(check => check.status === "fail"), checks };
}
