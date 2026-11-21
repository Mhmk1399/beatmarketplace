export const uploadStages = ["validating", "previewing", "storing", "saving"] as const;
export type UploadStage = typeof uploadStages[number];
export type UploadStageReporter = (stage: UploadStage) => void;
export const uploadStageLabels: Record<UploadStage, string> = {
  validating: "Checking your files…", previewing: "Creating your 30-second preview…",
  storing: "Storing your music and artwork…", saving: "Saving your track details…",
};
export const UPLOAD_PROGRESS_TYPE = "application/x-ndjson";

/** Consume only complete lines; retain split JSON until the next browser progress event. */
export class UploadProgressDecoder {
  private pending = "";
  private result: { status: number; body: unknown } | null = null;
  constructor(private report: UploadStageReporter) {}
  push(chunk: string) {
    if (this.result && chunk.trim()) throw new Error("Unexpected data after upload result.");
    this.pending += chunk;
    if (this.pending.length > 262_144) throw new Error("Upload response is too large.");
    let newline: number;
    while ((newline = this.pending.indexOf("\n")) !== -1) {
      const line = this.pending.slice(0, newline).trim(); this.pending = this.pending.slice(newline + 1);
      if (!line) continue;
      if (this.result) throw new Error("Unexpected data after upload result.");
      const frame = JSON.parse(line) as { type?: unknown; stage?: unknown; status?: unknown; body?: unknown };
      if (frame.type === "progress" && uploadStages.includes(frame.stage as UploadStage)) this.report(frame.stage as UploadStage);
      else if (frame.type === "heartbeat") continue;
      else if (frame.type === "result" && typeof frame.status === "number" && Number.isInteger(frame.status) && frame.status >= 200 && frame.status <= 599 && "body" in frame) this.result = { status: frame.status, body: frame.body };
      else throw new Error("Invalid upload progress response.");
    }
  }
  finish() {
    if (this.pending.trim() || !this.result) throw new Error("The upload response was interrupted. Retry to recover the saved result.");
    return this.result;
  }
}
