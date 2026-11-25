import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, workspaceError } from "@/lib/workspace/server";
import TrackModel from "@/models/Track";
import UserModel from "@/models/User";
import ProducerProfileModel from "@/models/ProducerProfile";
export async function GET(request: Request) {
  try {
    const auth = await requireUser(request, "PRODUCER");
    if (!auth.ok) return auth.response;
    const owned = z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .optional()
      .parse(
        new URL(request.url).searchParams.get("ownedTrackId") || undefined,
      );
    const tracks = owned
      ? await TrackModel.find({ _id: owned, producerId: auth.user._id }).select(
          "title collaborators",
        )
      : await TrackModel.find({
          collaborators: { $elemMatch: { userId: auth.user._id } },
        })
          .select("title producerId collaborators status")
          .sort({ updatedAt: -1 })
          .limit(100);
    const userIds = owned
      ? tracks.flatMap((track) =>
          track.collaborators.map((value) => value.userId),
        )
      : tracks.map((track) => track.producerId);
    const [users, profiles] = await Promise.all([
      UserModel.find({ _id: { $in: userIds } }).select(
        "firstName lastName profile.displayName",
      ),
      ProducerProfileModel.find({ userId: { $in: userIds } }).select(
        "userId stageName",
      ),
    ]);
    const names = new Map(
      users.map((user) => [
        String(user._id),
        user.profile?.displayName ||
          `${user.firstName} ${user.lastName}`.trim(),
      ]),
    );
    for (const profile of profiles)
      if (profile.stageName)
        names.set(String(profile.userId), profile.stageName);
    if (owned) {
      const track = tracks[0];
      return NextResponse.json(
        {
          items:
            track?.collaborators.map((value) => ({
              id: String(value.userId),
              name: names.get(String(value.userId)) || "Producer",
              status: value.status,
            })) ?? [],
        },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    return NextResponse.json(
      {
        items: tracks
          .flatMap((track) => {
            const invitation = track.collaborators.find(
              (value) => String(value.userId) === auth.user.id,
            );
            return invitation
              ? [
                  {
                    trackId: String(track._id),
                    title: track.title,
                    ownerName:
                      names.get(String(track.producerId)) || "Producer",
                    status: invitation.status,
                    invitedAt: invitation.invitedAt,
                    respondedAt: invitation.respondedAt,
                  },
                ]
              : [];
          })
          .sort(
            (a, b) =>
              Number(b.status === "PENDING") - Number(a.status === "PENDING"),
          ),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return workspaceError(error);
  }
}
