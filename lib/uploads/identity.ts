import { createHash } from "node:crypto";
import { MediaValidationError } from "@/lib/media/wav";

/** The existing unique _id index prevents duplicate creates, including across app instances. */
export function trackUploadIdentity(actorId: string, header: string | null) {
  if (!header) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(header)) throw new MediaValidationError("Invalid upload request identity.");
  return createHash("sha256").update(JSON.stringify(["track-upload", actorId, header.toLowerCase()])).digest("hex").slice(0, 24);
}
