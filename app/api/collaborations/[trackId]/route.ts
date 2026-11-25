import { NextResponse } from "next/server";
import { z } from "zod";
import {
  readJson,
  requireOrigin,
  requireUser,
  WorkspaceError,
  workspaceError,
} from "@/lib/workspace/server";
import TrackModel from "@/models/Track";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ trackId: string }> },
) {
  try {
    requireOrigin(request);
    const auth = await requireUser(request, "PRODUCER");
    if (!auth.ok) return auth.response;
    const id = z
        .string()
        .regex(/^[a-f\d]{24}$/i)
        .parse((await params).trackId),
      { action } = z
        .object({ action: z.enum(["ACCEPTED", "DECLINED"]) })
        .strict()
        .parse(await readJson(request));
    const result = await TrackModel.updateOne(
      {
        _id: id,
        collaborators: {
          $elemMatch: { userId: auth.user._id, status: "PENDING" },
        },
      },
      {
        $set: {
          "collaborators.$.status": action,
          "collaborators.$.respondedAt": new Date(),
        },
        $inc: { __v: 1 },
      },
    );
    if (!result.modifiedCount)
      throw new WorkspaceError(
        "This invitation was already answered or is unavailable.",
        409,
      );
    return NextResponse.json({ status: action });
  } catch (error) {
    return workspaceError(error);
  }
}
