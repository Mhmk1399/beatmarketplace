import { compare, hash } from "bcryptjs";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { NextResponse } from "next/server";

import { config, getJwtSecret } from "@/lib/config";
import { connectToDatabase } from "@/lib/db";
import type { UserRole } from "@/lib/types";
import UserModel, { type UserDocument } from "@/models/User";
import { requireSameOrigin, securityErrorResponse } from "@/lib/security/request";

export const AUTH_COOKIE_NAME = "beatmarketplace_access";

type AccessTokenPayload = JwtPayload & {
  sub: string;
  type: "access";
};

export type AuthenticatedUser = UserDocument;

export type AuthenticationResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; response: NextResponse };

export type SessionResolution =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; reason: "MISSING" | "INVALID" | "NOT_FOUND" | "DISABLED" };

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export function signAccessToken(user: { id: string; roles: UserRole[]; sessionVersion?: number }) {
  const options: SignOptions = {
    algorithm: "HS256",
    audience: config.jwtAudience,
    issuer: config.jwtIssuer,
    expiresIn: config.jwtExpiresIn as SignOptions["expiresIn"],
  };

  return jwt.sign(
    {
      sub: user.id,
      type: "access",
      sv: user.sessionVersion ?? 0,
      roles: user.roles,
    },
    getJwtSecret(),
    options,
  );
}

export function verifyAccessToken(token: string) {
  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      audience: config.jwtAudience,
      issuer: config.jwtIssuer,
    }) as AccessTokenPayload;

    if (!payload.sub || payload.type !== "access") return null;
    return payload;
  } catch {
    return null;
  }
}

function getCookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  for (const cookie of cookieHeader.split(";")) {
    const [key, ...valueParts] = cookie.trim().split("=");
    if (key === name) {
      try { return decodeURIComponent(valueParts.join("=")); } catch { return null; }
    }
  }

  return null;
}

export function getAccessToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const bearerToken = authorization.slice("Bearer ".length).trim();
    if (bearerToken) return bearerToken;
  }

  return getCookieValue(request, AUTH_COOKIE_NAME);
}

export async function resolveAuthenticatedUser(token: string | null | undefined): Promise<SessionResolution> {
  if (!token) return { ok: false, reason: "MISSING" };

  const payload = verifyAccessToken(token);
  if (!payload) return { ok: false, reason: "INVALID" };

  await connectToDatabase();
  const user = await UserModel.findById(payload.sub).select("+sessionVersion");
  if (!user) return { ok: false, reason: "NOT_FOUND" };
  if ((payload.sv ?? 0) !== (user.sessionVersion ?? 0)) return { ok: false, reason: "INVALID" };
  if (user.status && user.status !== "ACTIVE") return { ok: false, reason: "DISABLED" };

  return { ok: true, user };
}

export async function authenticateRequest(request: Request): Promise<AuthenticationResult> {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    try { requireSameOrigin(request); }
    catch (error) { return { ok: false, response: securityErrorResponse(error)! }; }
  }
  const resolution = await resolveAuthenticatedUser(getAccessToken(request));
  if (resolution.ok) return resolution;

  const errors = {
    MISSING: { error: "Unauthorized.", status: 401 },
    INVALID: { error: "Invalid or expired session.", status: 401 },
    NOT_FOUND: { error: "User not found.", status: 401 },
    DISABLED: { error: "Account access is disabled.", status: 403 },
  } as const;
  const failure = errors[resolution.reason];
  return { ok: false, response: NextResponse.json({ error: failure.error }, { status: failure.status, headers: { "Cache-Control": "private, no-store" } }) };
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}

export function serializeUser(user: UserDocument) {
  const data = user.toJSON();
  delete (data as Record<string, unknown>).sessionVersion;
  return data;
}
