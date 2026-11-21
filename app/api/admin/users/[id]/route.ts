import UserModel from "@/models/User";
import { idSchema, userPatchSchema } from "@/lib/workspace/validation";
import { json, readJson, requireOrigin, requireUser, WorkspaceError, workspaceError } from "@/lib/workspace/server";
import { protectAdminUser, saveAdminUser } from "@/lib/workspace/admin-users";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) { return saveAdminUser(request, (await context.params).id); }
export async function DELETE(request: Request, context: Context) { try { requireOrigin(request); const auth = await requireUser(request, "ADMIN"); if (!auth.ok) return auth.response; const id = idSchema.parse((await context.params).id); await protectAdminUser(id, [], "DEACTIVATED"); if (id === auth.user.id) throw new WorkspaceError("You cannot deactivate your own account.", 409); const raw = await readJson(request); const expectedVersion = userPatchSchema.shape.expectedVersion.parse(raw.expectedVersion); const saved = await UserModel.findOneAndUpdate({ _id: id, __v: expectedVersion }, { $set: { status: "DEACTIVATED" }, $inc: { __v: 1, sessionVersion: 1 } }, { returnDocument: "after" }); if (!saved) throw new WorkspaceError("This user changed or no longer exists. Refresh and try again.", 409); return json({ deactivated: true }); } catch (error) { return workspaceError(error); } }
