"use client";

import { useCallback, useState, type ReactNode } from "react";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardMobileNav } from "@/components/dashboard/DashboardMobileNav";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import type { NavigationSection } from "@/lib/dashboard/navigation";
import type { DashboardUser } from "@/lib/dashboard/session";
import type { WorkspaceDefinition } from "@/lib/dashboard/workspaces";

export function DashboardFrame({
  children,
  navigation,
  user,
  workspace,
  workspaces,
}: {
  children: ReactNode;
  navigation: readonly NavigationSection[];
  user: DashboardUser;
  workspace: WorkspaceDefinition;
  workspaces: readonly WorkspaceDefinition[];
}) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const closeNavigation = useCallback(() => setNavigationOpen(false), []);
  const openNavigation = useCallback(() => setNavigationOpen(true), []);

  return (
    <div className="dashboard-canvas page-shell min-h-dvh lg:grid lg:grid-cols-[18.5rem_minmax(0,1fr)]">
      <aside className="dashboard-sidebar-shell hidden h-dvh p-4 lg:sticky lg:top-0 lg:block">
        <div className="neo-raised h-full overflow-hidden rounded-[28px]">
          <DashboardSidebar activeWorkspace={workspace} navigation={navigation} user={user} workspaces={workspaces} />
        </div>
      </aside>

      <div className="min-w-0">
        <DashboardHeader navigation={navigation} onOpenNavigation={openNavigation} user={user} workspace={workspace} />
        <main id="dashboard-content" className="px-4 pb-12 pt-5 sm:px-6 sm:pb-16 lg:px-8 lg:pt-7">
          <div className="mx-auto w-full max-w-[92rem]">{children}</div>
        </main>
      </div>

      <DashboardMobileNav activeWorkspace={workspace} navigation={navigation} onClose={closeNavigation} open={navigationOpen} user={user} workspaces={workspaces} />
    </div>
  );
}
