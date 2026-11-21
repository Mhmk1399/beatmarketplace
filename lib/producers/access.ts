import UserModel from "@/models/User";
import { idSchema } from "@/lib/workspace/validation";
import { requireUser, WorkspaceError } from "@/lib/workspace/server";

/** A supplied target is an admin operation; owner APIs never accept a target from request data. */
export async function requireProducerSettingsAccess(request: Request, targetId?: string) {
  const auth = await requireUser(request, targetId ? "ADMIN" : "PRODUCER");
  if (!auth.ok) return auth;
  const id = targetId ? idSchema.parse(targetId) : auth.user.id;
  const user = id === auth.user.id ? auth.user : await UserModel.findById(id);
  if (!user || !user.roles.includes("PRODUCER")) throw new WorkspaceError("Producer not found.", 404);
  return { ok: true as const, user };
}
