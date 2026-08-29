// Log in an existing user and return a signed access token.
import { NextResponse } from "next/server";

import { signAccessToken, verifyPassword, sanitizeUser } from "@/lib/auth";
import { getUserByEmail } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const token = signAccessToken(user);

    return NextResponse.json({
      user: sanitizeUser(user),
      token,
    });
  } catch (error) {
    console.error("Login error", error);
    return NextResponse.json({ error: "Failed to log in." }, { status: 500 });
  }
}
