// Beat listing and producer-authoring endpoints.
import { NextResponse } from "next/server";

import { getBearerToken, getUserFromToken } from "@/lib/auth";
import { createBeatRecord, getBeatById, getPublishedBeats, getUserById, updateBeatRecord } from "@/lib/store";
import { userCanManageBeat } from "@/lib/permissions";
import type { Beat } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ beats: getPublishedBeats() });
}

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

    if (!user.roles.includes("PRODUCER")) {
      return NextResponse.json({ error: "Producer access required." }, { status: 403 });
    }

    const body = (await request.json()) as Partial<Beat> & {
      title?: string;
      description?: string;
      genre?: string;
      mood?: string;
      bpm?: number;
      key?: string;
      tags?: string[];
      status?: Beat["status"];
    };

    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ error: "Beat title is required." }, { status: 400 });
    }

    const beat = createBeatRecord({
      producerId: user.id,
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      description: body.description ?? "",
      genre: body.genre ?? "Unknown",
      mood: body.mood ?? "Neutral",
      bpm: body.bpm ?? 120,
      key: body.key ?? "C",
      tags: body.tags ?? [],
      coverUrl: null,
      previewUrl: null,
      masterUrl: null,
      status: body.status ?? "DRAFT",
      licenses: [],
    });

    return NextResponse.json({ beat }, { status: 201 });
  } catch (error) {
    console.error("Beat creation error", error);
    return NextResponse.json({ error: "Failed to create beat." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = getUserFromToken(token);
    if (!payload || !payload.sub) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as { id?: string; status?: Beat["status"]; title?: string; description?: string; genre?: string; mood?: string; bpm?: number; key?: string; tags?: string[] };
    const beat = getBeatById(body.id ?? "");
    if (!beat) {
      return NextResponse.json({ error: "Beat not found." }, { status: 404 });
    }

    const user = getUserById(payload.sub);
    if (!user || !userCanManageBeat(user, beat)) {
      return NextResponse.json({ error: "Permission denied." }, { status: 403 });
    }

    const updatedBeat = updateBeatRecord(beat.id, {
      title: body.title ?? beat.title,
      description: body.description ?? beat.description,
      genre: body.genre ?? beat.genre,
      mood: body.mood ?? beat.mood,
      bpm: body.bpm ?? beat.bpm,
      key: body.key ?? beat.key,
      tags: body.tags ?? beat.tags,
      status: body.status ?? beat.status,
    });

    return NextResponse.json({ beat: updatedBeat });
  } catch (error) {
    console.error("Beat update error", error);
    return NextResponse.json({ error: "Failed to update beat." }, { status: 500 });
  }
}
