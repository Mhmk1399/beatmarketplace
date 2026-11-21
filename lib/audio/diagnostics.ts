export type ListeningResult = {
  outcome: "complete" | "cancelled" | "failed";
  startMs: number | null;
  stalls: number;
  bufferingMs: number;
  observedMs: number;
  positionSeconds: number;
};

/** Clock values come from performance.now(); no network or account data is collected. */
export class ListeningMeasurement {
  private firstPlaying: number | null = null;
  private waitingAt: number | null = null;
  private stalls = 0;
  private bufferingMs = 0;
  private result: ListeningResult | null = null;
  constructor(private clickedAt: number) {}

  playing(at: number) {
    if (this.result) return;
    if (this.firstPlaying === null) this.firstPlaying = at;
    if (this.waitingAt !== null) {
      this.bufferingMs += Math.max(0, at - this.waitingAt);
      this.waitingAt = null;
    }
  }
  waiting(at: number) {
    if (this.result || this.firstPlaying === null || this.waitingAt !== null) return;
    this.stalls++; this.waitingAt = at;
  }
  finish(at: number, outcome: ListeningResult["outcome"], positionSeconds: number): ListeningResult {
    if (this.result) return this.result;
    this.result = {
      outcome, startMs: this.firstPlaying === null ? null : Math.round(Math.max(0, this.firstPlaying - this.clickedAt)),
      stalls: this.stalls,
      bufferingMs: Math.round(this.bufferingMs + (this.waitingAt === null ? 0 : Math.max(0, at - this.waitingAt))),
      observedMs: Math.round(Math.max(0, at - this.clickedAt)),
      positionSeconds: Number.isFinite(positionSeconds) ? Math.max(0, positionSeconds) : 0,
    };
    return this.result;
  }
}
