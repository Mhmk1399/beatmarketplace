import type { ReactNode } from "react";

import { DashboardFrame } from "@/components/dashboard/DashboardFrame";
import { getNavigation } from "@/lib/dashboard/navigation";
import type { DashboardUser } from "@/lib/dashboard/session";
import { getAvailableWorkspaces, getWorkspace, type WorkspaceId } from "@/lib/dashboard/workspaces";

export function DashboardShell({ children, user, workspaceId }: { children: ReactNode; user: DashboardUser; workspaceId: WorkspaceId }) {
  const workspace = getWorkspace(workspaceId);
  const workspaces = getAvailableWorkspaces(user.roles);
  const navigation = getNavigation(workspaceId);

  return <DashboardFrame navigation={navigation} user={user} workspace={workspace} workspaces={workspaces}>{children}</DashboardFrame>;
}
