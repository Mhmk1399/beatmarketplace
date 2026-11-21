import { createClientId } from "@/lib/client-id";

type Submission = { url: string; method: string; data: string; master: object | null; artwork: object | null };
/** Same submission reuses its identity; changing any form data or selected file starts a new one. */
export class UploadSubmission {
  private previous: Submission | null = null;
  private id = "";
  constructor(private createId: () => string = createClientId) {}
  identify(next: Submission) {
    const previous = this.previous;
    if (!previous || previous.url !== next.url || previous.method !== next.method || previous.data !== next.data || previous.master !== next.master || previous.artwork !== next.artwork) {
      this.id = this.createId(); this.previous = { ...next };
    }
    return this.id;
  }
}
