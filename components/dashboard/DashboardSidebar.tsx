"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DashboardAvatar, getUserName } from "@/components/dashboard/DashboardAvatar";
import { NavigationSection } from "@/components/dashboard/NavigationSection";
import { WorkspaceSwitcher } from "@/components/dashboard/WorkspaceSwitcher";
import { BrandMark } from "@/components/public/BrandMark";
import { SettingsIcon } from "@/components/ui/icons";
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
    <div className="flex h-full min-h-0 flex-col px-4 py-5">
      <BrandMark href="/dashboard" className="px-1" />
      <div className="mt-7">
        <WorkspaceSwitcher activeWorkspace={activeWorkspace} workspaces={workspaces} />
      </div>

      <nav aria-label={`${activeWorkspace.label} navigation`} className="dashboard-sidebar-scroll mt-7 min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
        {navigation.map((section, index) => (
          <NavigationSection key={section.label ?? `primary-${index}`} section={section} pathname={pathname} workspaceRoot={activeWorkspace.href} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="mt-5 border-t border-white/[0.045] pt-4">
        <Link href={`${activeWorkspace.href}/settings`} onClick={onNavigate} className="mb-3 flex min-h-10 items-center gap-3 rounded-xl px-3 text-xs font-semibold text-[#858b97] hover:bg-white/[0.025] hover:text-[#dad7de]">
          <SettingsIcon className="size-[17px]" /> Account settings
        </Link>
        <div className="neo-inset flex min-w-0 items-center gap-3 rounded-[18px] p-3">
          <DashboardAvatar user={user} className="size-10" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-[#e4e1e8]">{getUserName(user)}</span>
            <span className="mt-0.5 block truncate text-[11px] text-[#777d89]">{user.email}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
