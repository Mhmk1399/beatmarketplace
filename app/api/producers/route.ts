// Become a producer and create a profile for the authenticated user.
import { NextResponse } from "next/server";

import { getBearerToken, getUserFromToken } from "@/lib/auth";
import { getProducerProfileByUserId, createProducerProfileRecord, getUserById } from "@/lib/store";
import { userCanBecomeProducer } from "@/lib/permissions";

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = getUserFromToken(token);
    if (!payload || !payload.sub) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const user = getUserById(payload.sub);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (!userCanBecomeProducer(user)) {
      return NextResponse.json({ error: "User cannot become a producer." }, { status: 403 });
    }

    const existingProfile = getProducerProfileByUserId(user.id);
    if (existingProfile) {
      return NextResponse.json({ error: "Producer profile already exists." }, { status: 409 });
    }

    const body = (await request.json()) as {
      stageName?: string;
      bio?: string;
      location?: string;
      genres?: string[];
      storefrontName?: string;
    };

    const stageName = body.stageName?.trim() || `${user.firstName} ${user.lastName}`;
    const profile = createProducerProfileRecord({
      userId: user.id,
      stageName,
      bio: body.bio ?? "",
      avatarUrl: null,
      bannerUrl: null,
      location: body.location ?? null,
      genres: body.genres ?? [],
      socialLinks: {},
      storefrontName: body.storefrontName ?? `${stageName} Store`,
    });

    user.roles = Array.from(new Set([...user.roles, "PRODUCER"]));
    user.updatedAt = new Date().toISOString();

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error("Producer creation error", error);
    return NextResponse.json({ error: "Failed to create producer profile." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = getUserFromToken(token);
    if (!payload || !payload.sub) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const profile = getProducerProfileByUserId(payload.sub);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Producer fetch error", error);
    return NextResponse.json({ error: "Failed to load producer profile." }, { status: 500 });
  }
}
