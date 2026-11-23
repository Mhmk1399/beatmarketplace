import { readSecureJson, securityErrorResponse } from "@/lib/security/request";
import { NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth";
import { requireRole, userCanBecomeProducer } from "@/lib/permissions";
import { producerProfileSchema, validationError } from "@/lib/validation";
import ProducerProfileModel from "@/models/ProducerProfile";

export async function POST(request: Request) {
  try {
    const authentication = await authenticateRequest(request);
    if (!authentication.ok) return authentication.response;

    const user = authentication.user;
    const roleError = requireRole({ id: user.id, roles: user.roles }, "USER");
    if (roleError) return roleError;

    const existingProfile = await ProducerProfileModel.findOne({ userId: user._id });
    if (existingProfile) {
      if (!user.roles.includes("PRODUCER")) {
        user.roles = Array.from(new Set([...user.roles, "PRODUCER"]));
        await user.save();
      }

      return NextResponse.json({ profile: existingProfile.toJSON(), created: false });
    }

    if (!userCanBecomeProducer({ id: user.id, roles: user.roles })) {
      return NextResponse.json({ error: "User cannot become a producer." }, { status: 403 });
    }

    const parsed = producerProfileSchema.safeParse(await readSecureJson(request));
    if (!parsed.success) {
      return NextResponse.json(validationError(parsed.error), { status: 400 });
    }

    const stageName = parsed.data.stageName ?? `${user.firstName} ${user.lastName}`;
    const profile = await ProducerProfileModel.create({
      userId: user._id,
      stageName,
      bio: parsed.data.bio,
      genreIds: parsed.data.genreIds,
      storefrontName: parsed.data.storefrontName ?? `${stageName} Store`,
    });

    user.roles = Array.from(new Set([...user.roles, "PRODUCER"]));
    await user.save();

    return NextResponse.json({ profile: profile.toJSON(), created: true }, { status: 201 });
  } catch (error) {
    const secured = securityErrorResponse(error); if (secured) return secured;
    if (typeof error === "object" && error && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "Producer profile already exists." }, { status: 409 });
    }

    console.error("Producer creation error", error);
    return NextResponse.json({ error: "Failed to create producer profile." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const authentication = await authenticateRequest(request);
    if (!authentication.ok) return authentication.response;

    const profile = await ProducerProfileModel.findOne({ userId: authentication.user._id });
    return NextResponse.json({ profile: profile?.toJSON() ?? null });
  } catch (error) {
    const secured = securityErrorResponse(error); if (secured) return secured;
    console.error("Producer fetch error", error);
    return NextResponse.json({ error: "Failed to load producer profile." }, { status: 500 });
  }
}
