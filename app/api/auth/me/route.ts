// Return the currently authenticated user when a valid bearer token is supplied.
import { NextResponse } from "next/server";

import { getBearerToken, getUserFromToken, sanitizeUser } from "@/lib/auth";
import { getUserById } from "@/lib/store";

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

    const user = getUserById(payload.sub);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error("Me error", error);
    return NextResponse.json({ error: "Failed to retrieve user." }, { status: 500 });
  }
}
