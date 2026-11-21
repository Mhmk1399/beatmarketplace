import { UPLOAD_PROGRESS_TYPE, type UploadStageReporter } from "./protocol";

/** Auth/role checks happen before this wrapper. JSON clients retain normal HTTP responses. */
export function trackUploadResponse(request: Request, operation: (report: UploadStageReporter) => Promise<Response>, onError: (error: unknown) => Response) {
  if (!request.headers.get("accept")?.includes(UPLOAD_PROGRESS_TYPE)) return operation(() => {}).catch(onError);
  const encoder = new TextEncoder();
  let closed = false;
  let heartbeat: ReturnType<typeof setInterval>;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (frame: unknown) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(`${JSON.stringify(frame)}\n`)); }
        catch { closed = true; }
      };
      heartbeat = setInterval(() => emit({ type: "heartbeat" }), 10_000);
      void (async () => {
        let response: Response;
        try { response = await operation(stage => emit({ type: "progress", stage })); }
        catch (error) { response = onError(error); }
        const body = await response.json().catch(() => ({ error: "The server could not finish this upload. Please retry." }));
        emit({ type: "result", status: response.status, body });
      })().catch(() => emit({ type: "result", status: 503, body: { error: "The upload could not be completed. Please retry." } }))
        .finally(() => { clearInterval(heartbeat); if (!closed) { closed = true; controller.close(); } });
    },
    cancel() { closed = true; clearInterval(heartbeat); },
  });
  return new Response(stream, { headers: { "Content-Type": `${UPLOAD_PROGRESS_TYPE}; charset=utf-8`, "Content-Encoding": "identity", "Cache-Control": "private, no-store, no-transform", "X-Accel-Buffering": "no" } });
}
