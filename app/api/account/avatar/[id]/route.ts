import UserModel from "@/models/User";
import { idSchema } from "@/lib/workspace/validation";
import { json, requireUser, workspaceError } from "@/lib/workspace/server";
import { serveStoredAsset } from "@/lib/media/delivery";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) { try { const auth = await requireUser(request); if (!auth.ok) return auth.response; const id = idSchema.parse((await context.params).id); if (id !== auth.user.id && !auth.user.roles.includes("ADMIN")) return json({ error: "Not found." }, 404); const user = await UserModel.findById(id).select("profile.avatar"); if (!user?.profile.avatar) return json({ error: "Not found." }, 404); return serveStoredAsset(request, user.profile.avatar); } catch (error) { return workspaceError(error); } }
