import { NextResponse } from "next/server";

import type { UserRole } from "@/lib/types";

type AuthorizedUser = {
  id: string;
  roles: UserRole[];
};

export function userHasRole(user: AuthorizedUser, role: UserRole) {
  return user.roles.includes(role);
}

export function requireRole(user: AuthorizedUser, role: UserRole) {
  if (userHasRole(user, role) || userHasRole(user, "ADMIN")) return null;

  return NextResponse.json({ error: `${role.toLowerCase()} access required.` }, { status: 403 });
}

export function userCanManageOwnedResource(user: AuthorizedUser, ownerId: string) {
  return user.id === ownerId || userHasRole(user, "ADMIN");
}

export function requireResourceOwner(user: AuthorizedUser, ownerId: string) {
  if (userCanManageOwnedResource(user, ownerId)) return null;

  return NextResponse.json({ error: "Permission denied." }, { status: 403 });
}

export function userCanBecomeProducer(user: AuthorizedUser) {
  return userHasRole(user, "USER") || userHasRole(user, "ADMIN");
}
