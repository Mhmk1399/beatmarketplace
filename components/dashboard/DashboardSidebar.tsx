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
    <div className="flex h-full min-h-0 flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
      <BrandMark href="/dashboard" className="min-h-11 px-1" onClick={onNavigate} />
      <div className="mt-5">
        <WorkspaceSwitcher activeWorkspace={activeWorkspace} workspaces={workspaces} onNavigate={onNavigate} />
      </div>

      <nav aria-label={`${activeWorkspace.label} navigation`} className="dashboard-sidebar-scroll mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {navigation.map((section, index) => (
          <NavigationSection key={section.label ?? `primary-${index}`} section={section} pathname={pathname} workspaceRoot={activeWorkspace.href} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="mt-5 border-t border-divider pt-4">

        <div className="neo-inset flex min-w-0 items-center gap-3 rounded-[18px] p-3">
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
