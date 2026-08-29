// Authentication utilities for the marketplace MVP.
// These helpers intentionally keep JWT and password-related logic in one place so it
// can be swapped out later for a production auth system or an external provider.
import { compare, hash } from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";

import { config } from "@/lib/config";
import type { User } from "@/lib/types";

export async function hashPassword(password: string) {
  return hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export function signAccessToken(user: Pick<User, "id" | "email" | "roles">) {
  const payload = {
    sub: user.id,
    email: user.email,
    roles: user.roles,
  };

  const options: SignOptions = {
    expiresIn: config.jwtExpiresIn as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, config.jwtSecret, options);
}

export function getUserFromToken(token: string) {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { sub: string; email: string; roles: string[] };
    return payload;
  } catch {
    return null;
  }
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) return null;

  return authorization.replace("Bearer ", "").trim();
}

export function sanitizeUser(user: User) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}
