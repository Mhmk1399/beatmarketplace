import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireUser,
  workspaceError,
  escapeRegex,
} from "@/lib/workspace/server";
import UserModel from "@/models/User";
import ProducerProfileModel from "@/models/ProducerProfile";
export async function GET(request: Request) {
  try {
    const auth = await requireUser(request, "PRODUCER");
    if (!auth.ok) return auth.response;
    const q = z
      .string()
      .trim()
      .max(120)
      .default("")
      .parse(new URL(request.url).searchParams.get("q") ?? "");
    const expression = q
      ? { $regex: escapeRegex(q), $options: "i" }
      : undefined;
    const matchingProfiles = expression
      ? await ProducerProfileModel.find({ stageName: expression })
          .select("userId stageName")
          .limit(30)
      : [];
    const profileIds = matchingProfiles.map((value) => value.userId);
    const users = await UserModel.find({
      _id: { $ne: auth.user._id },
      roles: "PRODUCER",
      status: "ACTIVE",
      ...(expression
        ? {
            $or: [
              { _id: { $in: profileIds } },
              { "profile.displayName": expression },
            ],
          }
        : {}),
    })
      .select("firstName lastName profile.displayName")
      .limit(30);
    const profiles = await ProducerProfileModel.find({
      userId: { $in: users.map((user) => user._id) },
    }).select("userId stageName");
    const names = new Map(
      profiles.map((value) => [String(value.userId), value.stageName]),
    );
    return NextResponse.json(
      {
        items: users.map((user) => ({
          id: String(user._id),
          name:
            names.get(String(user._id)) ||
            user.profile?.displayName ||
            "Producer",
        })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return workspaceError(error);
  }
}
