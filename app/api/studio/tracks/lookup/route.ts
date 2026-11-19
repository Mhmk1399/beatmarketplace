import TrackModel from "@/models/Track";
import { z } from "zod";
import { idSchema } from "@/lib/workspace/validation";
import { json, requireUser, workspaceError } from "@/lib/workspace/server";
export async function GET(request: Request) { try { const auth = await requireUser(request, "PRODUCER"); if (!auth.ok) return auth.response; const ids = z.array(idSchema).max(100).parse((new URL(request.url).searchParams.get("ids") ?? "").split(",").filter(Boolean)); const tracks = await TrackModel.find({ _id: { $in: ids }, producerId: auth.user._id }).select("title status"); return json({ items: tracks.map(track => ({ id: String(track._id), title: track.title, status: track.status })) }); } catch (error) { return workspaceError(error); } }
