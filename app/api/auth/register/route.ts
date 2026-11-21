import { NextResponse } from "next/server";

import { hashPassword, serializeUser, setAuthCookie, signAccessToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { registerSchema, validationError } from "@/lib/validation";
import UserModel from "@/models/User";
import { readSecureJson, requireSameOrigin, securityErrorResponse } from "@/lib/security/request";
import { consumeApiQuota } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const parsed = registerSchema.safeParse(await readSecureJson(request));
    if (!parsed.success) {
      return NextResponse.json(validationError(parsed.error), { status: 400 });
    }

    await connectToDatabase();
    await consumeApiQuota("register", parsed.data.email, 3, 3600_000);

    const identityFilters: Array<Record<string, string>> = [{ email: parsed.data.email }];
    if (parsed.data.phoneNumber) identityFilters.push({ phoneNumber: parsed.data.phoneNumber });

    const existingUser = await UserModel.exists({ $or: identityFilters });
    if (existingUser) {
      return NextResponse.json({ error: "Email or phone number is already registered." }, { status: 409 });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await UserModel.create({
      email: parsed.data.email,
      passwordHash,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phoneNumber: parsed.data.phoneNumber,
      roles: ["USER"],
      isEmailVerified: false,
    });

    const token = signAccessToken({ id: user.id, roles: user.roles });
    const response = NextResponse.json({ user: serializeUser(user) }, { status: 201 });
    response.headers.set("Cache-Control", "no-store");
    return setAuthCookie(response, token);
  } catch (error) {
    const secured = securityErrorResponse(error);
    if (secured) return secured;
    if (typeof error === "object" && error && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "Email or phone number is already registered." }, { status: 409 });
    }

    console.error("Registration error", error);
    return NextResponse.json({ error: "Failed to register user." }, { status: 500 });
  }
}
