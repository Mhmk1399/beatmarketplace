// Register a new user and issue an access token.
import { NextResponse } from "next/server";

import { hashPassword, signAccessToken } from "@/lib/auth";
import { createUserRecord, getUserByEmail } from "@/lib/store";
import { sanitizeUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
    };

    const email = body.email?.trim();
    const password = body.password ?? "";
    const firstName = body.firstName?.trim() ?? "";
    const lastName = body.lastName?.trim() ?? "";

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: "Email, password, first name, and last name are required." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    if (getUserByEmail(normalizedEmail)) {
      return NextResponse.json({ error: "User already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = createUserRecord({
      email: normalizedEmail,
      passwordHash,
      firstName,
      lastName,
      roles: ["USER"],
      isEmailVerified: false,
    });

    const token = signAccessToken(user);

    return NextResponse.json({
      user: sanitizeUser(user),
      token,
    }, { status: 201 });
  } catch (error) {
    console.error("Register error", error);
    return NextResponse.json({ error: "Failed to register user." }, { status: 500 });
  }
}
