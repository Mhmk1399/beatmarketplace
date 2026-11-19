export type UploadTransferProgress = { phase: "preparing" | "uploading" | "processing"; loaded: number; total: number | null; percent: number | null };
export type FileUploadProgress = Omit<UploadTransferProgress, "phase"> & { phase: "idle" | UploadTransferProgress["phase"] | "success" | "error" | "cancelled" };
export const idleUpload: FileUploadProgress = { phase: "idle", loaded: 0, total: null, percent: null };

/** Track browser-to-server bytes. Server-side storage/processing remains indeterminate. */
export function uploadRequest(url: string, init: RequestInit, signal: AbortSignal, report: (progress: UploadTransferProgress) => void): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let loaded = 0, total: number | null = null, settled = false;
    const cleanup = () => { signal.removeEventListener("abort", abort); xhr.onload = xhr.onerror = xhr.onabort = xhr.ontimeout = null; xhr.upload.onprogress = xhr.upload.onload = null; };
    const fail = (error: Error) => { if (settled) return; settled = true; cleanup(); reject(error); };
    const abort = () => { xhr.abort(); fail(new DOMException("Upload cancelled.", "AbortError")); };
    if (signal.aborted) { fail(new DOMException("Upload cancelled.", "AbortError")); return; }
    // Register before open/send for consistent upload events across browsers.
    xhr.upload.onprogress = event => {
      loaded = event.loaded; total = event.lengthComputable && event.total > 0 ? event.total : null;
      report({ phase: "uploading", loaded, total, percent: total ? Math.min(100, Math.floor(loaded / total * 100)) : null });
    };
    xhr.upload.onload = () => report({ phase: "processing", loaded: total ?? loaded, total, percent: total ? 100 : null });
    xhr.onload = () => {
      if (settled) return;
      try {
        const headers = new Headers();
        for (const line of xhr.getAllResponseHeaders().trim().split(/[\r\n]+/)) { const colon = line.indexOf(":"); if (colon > 0) headers.append(line.slice(0, colon).trim(), line.slice(colon + 1).trim()); }
        const response = new Response([204, 205, 304].includes(xhr.status) ? null : xhr.responseText, { status: xhr.status, statusText: xhr.statusText, headers });
        settled = true; cleanup(); resolve(response);
      } catch (error) { fail(error instanceof Error ? error : new Error("Invalid upload response.")); }
    };
    xhr.onerror = () => fail(new TypeError("Upload connection lost."));
    xhr.onabort = () => fail(new DOMException("Upload cancelled.", "AbortError"));
    xhr.ontimeout = () => fail(new DOMException("Upload timed out.", "TimeoutError"));
    try {
      xhr.open(init.method ?? "POST", url, true);
      xhr.withCredentials = init.credentials === "include";
      const headers = new Headers(init.headers);
      // Let the browser generate the multipart boundary.
      headers.delete("Content-Type");
      headers.forEach((value, name) => xhr.setRequestHeader(name, value));
      signal.addEventListener("abort", abort, { once: true });
      report({ phase: "uploading", loaded: 0, total: null, percent: 0 });
      xhr.send(init.body as FormData);
    } catch (error) { fail(error instanceof Error ? error : new Error("Upload could not start.")); }
  });
}
