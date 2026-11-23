"use client";


import { usePathname } from "next/navigation";

import { DashboardAvatar, getUserName } from "@/components/dashboard/DashboardAvatar";
import { NavigationSection } from "@/components/dashboard/NavigationSection";
import { WorkspaceSwitcher } from "@/components/dashboard/WorkspaceSwitcher";
import { BrandMark } from "@/components/public/BrandMark";

import type { NavigationSection as NavigationSectionDefinition } from "@/lib/dashboard/navigation";
import type { DashboardUser } from "@/lib/dashboard/session";
import type { WorkspaceDefinition } from "@/lib/dashboard/workspaces";

export function DashboardSidebar({
  activeWorkspace,
  navigation,
  onNavigate,
  user,
  workspaces,
}: {
  activeWorkspace: WorkspaceDefinition;
  navigation: readonly NavigationSectionDefinition[];
  onNavigate?: () => void;
  user: DashboardUser;
  workspaces: readonly WorkspaceDefinition[];
}) {
  const pathname = usePathname();

  return (
    <div className="dashboard-sidebar-content flex h-full min-h-0 flex-col">
      <div className="dashboard-drawer-brand"><BrandMark href={activeWorkspace.href} className="min-h-11 px-1" onClick={onNavigate} /></div>
      <div className="dashboard-drawer-workspace">
        <WorkspaceSwitcher activeWorkspace={activeWorkspace} workspaces={workspaces} onNavigate={onNavigate} />
      </div>

      <nav aria-label={`${activeWorkspace.label} navigation`} className="dashboard-sidebar-scroll min-h-0 flex-1 space-y-4 overflow-y-auto">
        {navigation.map((section, index) => (
          <NavigationSection key={section.label ?? `primary-${index}`} section={section} pathname={pathname} workspaceRoot={activeWorkspace.href} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="dashboard-sidebar-account">

        <div className="flex min-w-0 items-center gap-3">
          <DashboardAvatar user={user} className="size-10" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-foreground">{getUserName(user)}</span>
            <span className="mt-0.5 block truncate text-[11px] text-faint">{user.email}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
