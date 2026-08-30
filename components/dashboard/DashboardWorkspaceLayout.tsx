import type { ReactNode } from "react";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { requireWorkspaceUser, toDashboardUser } from "@/lib/dashboard/session";
import type { WorkspaceId } from "@/lib/dashboard/workspaces";

export async function DashboardWorkspaceLayout({ children, workspaceId }: { children: ReactNode; workspaceId: WorkspaceId }) {
  const user = await requireWorkspaceUser(workspaceId);
  return <DashboardShell user={toDashboardUser(user)} workspaceId={workspaceId}>{children}</DashboardShell>;
}
