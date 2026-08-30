import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AUTH_COOKIE_NAME, resolveAuthenticatedUser } from "@/lib/auth";
import { canAccessWorkspace, getWorkspace, type WorkspaceId } from "@/lib/dashboard/workspaces";
import type { User } from "@/lib/types";
import type { UserDocument } from "@/models/User";

export type DashboardUser = Pick<User, "id" | "email" | "firstName" | "lastName" | "roles"> & {
  profile: Pick<User["profile"], "username" | "displayName"> & {
    avatarUrl?: string;
  };
};

export const getServerAuthenticatedUser = cache(async () => {
  const cookieStore = await cookies();
  const resolution = await resolveAuthenticatedUser(cookieStore.get(AUTH_COOKIE_NAME)?.value);
  return resolution.ok ? resolution.user : null;
});

export async function requireWorkspaceUser(workspaceId: WorkspaceId) {
  const user = await getServerAuthenticatedUser();
  if (!user) redirect("/login");

  const workspace = getWorkspace(workspaceId);
  if (!canAccessWorkspace(user.roles, workspace)) redirect("/dashboard");
  return user;
}

export function toDashboardUser(user: UserDocument): DashboardUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: [...user.roles],
    profile: {
      username: user.profile?.username,
      displayName: user.profile?.displayName,
      avatarUrl: user.profile?.avatar?.publicUrl,
    },
  };
}
