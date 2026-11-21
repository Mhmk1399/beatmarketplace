import { NextResponse } from "next/server";

import { serializeUser, setAuthCookie, signAccessToken, verifyPassword } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { loginSchema, validationError } from "@/lib/validation";
import UserModel from "@/models/User";
import { readSecureJson, requireSameOrigin, securityErrorResponse } from "@/lib/security/request";
import { consumeApiQuota } from "@/lib/security/rate-limit";

const DUMMY_PASSWORD_HASH = "$2a$12$V6nWkH5VJgk5tV3XqkWkE.9Xc9xUeMNrV4t7Ca2vQ7k0Wm2TQw3V6";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const parsed = loginSchema.safeParse(await readSecureJson(request));
    if (!parsed.success) {
      return NextResponse.json(validationError(parsed.error), { status: 400 });
    }

    await connectToDatabase();
    await consumeApiQuota("login", parsed.data.email, 10, 15 * 60_000);
    const user = await UserModel.findOne({ email: parsed.data.email }).select("+passwordHash +sessionVersion");
    const isValidPassword = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

    if (!user || !isValidPassword) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    if (user.status && user.status !== "ACTIVE") {
      return NextResponse.json({ error: "This account is unavailable." }, { status: 403 });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signAccessToken({ id: user.id, roles: user.roles, sessionVersion: user.sessionVersion });
    const response = NextResponse.json({ user: serializeUser(user) });
    response.headers.set("Cache-Control", "no-store");
    return setAuthCookie(response, token);
  } catch (error) {
    const secured = securityErrorResponse(error);
    if (secured) return secured;
    console.error("Login error", error);
    return NextResponse.json({ error: "Failed to log in." }, { status: 500 });
  }
}
