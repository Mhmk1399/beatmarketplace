import { trackUploadResponse } from "@/lib/uploads/server-progress";
import TrackModel from "@/models/Track";
import { idSchema } from "@/lib/workspace/validation";
import { json, readJson, requireOrigin, requireUser, WorkspaceError, workspaceError } from "@/lib/workspace/server";
import { mutateAdminTrack } from "@/lib/workspace/tracks";
import { z } from "zod";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) { try { requireOrigin(request); const auth = await requireUser(request, "ADMIN"); if (!auth.ok) return auth.response; const id = idSchema.parse((await context.params).id); return trackUploadResponse(request, report => mutateAdminTrack(request, id, report, auth.user.id), workspaceError); } catch (error) { return workspaceError(error); } }
export async function DELETE(request: Request, context: Context) { try { requireOrigin(request); const auth = await requireUser(request, "ADMIN"); if (!auth.ok) return auth.response; const id = idSchema.parse((await context.params).id), { expectedVersion } = z.object({ expectedVersion: z.number().int().min(0) }).strict().parse(await readJson(request)); const track = await TrackModel.findOneAndUpdate({ _id: id, __v: expectedVersion }, { $set: { status: "ARCHIVED", visibility: "PRIVATE" }, $inc: { __v: 1 } }, { new: true }); if (!track) throw new WorkspaceError("This beat changed or no longer exists. Refresh and try again.", 409); return json({ archived: true }); } catch (error) { return workspaceError(error); } }
