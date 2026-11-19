"use client";

import { usePathname, useRouter } from "next/navigation";

import { DashboardUserMenu } from "@/components/dashboard/DashboardUserMenu";
import { MenuIcon, SearchIcon } from "@/components/ui/icons";
import { getNavigationItems, isNavigationItemActive, type NavigationSection } from "@/lib/dashboard/navigation";
import type { DashboardUser } from "@/lib/dashboard/session";
import type { WorkspaceDefinition } from "@/lib/dashboard/workspaces";

export function DashboardHeader({
  navigation,
  navigationId,
  navigationOpen,
  onOpenNavigation,
  user,
  workspace,
}: {
  navigation: readonly NavigationSection[];
  navigationId: string;
  navigationOpen: boolean;
  onOpenNavigation: () => void;
  user: DashboardUser;
  workspace: WorkspaceDefinition;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const currentItem = getNavigationItems(workspace.id).find((item) => isNavigationItemActive(pathname, item, workspace.href));

  return (
    <header className="dashboard-header sticky top-0 z-30 flex min-h-20 items-center gap-3 px-4 sm:px-6 lg:px-8">
      <button type="button" className="neo-icon-button inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] lg:hidden" onClick={onOpenNavigation} aria-label="Open dashboard navigation" aria-expanded={navigationOpen} aria-controls={navigationId} aria-haspopup="dialog">
        <MenuIcon className="size-5" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-extrabold uppercase tracking-[0.17em] text-faint">{workspace.label}</p>
        <h1 className="mt-1 truncate text-lg font-black tracking-[-0.025em] text-foreground sm:text-xl">{currentItem?.label ?? navigation[0]?.items[0]?.label ?? "Overview"}</h1>
      </div>
      <form className="dashboard-search" onSubmit={event=>{event.preventDefault();const q=String(new FormData(event.currentTarget).get("q")??"").trim();if(q)router.push(`/marketplace?q=${encodeURIComponent(q)}`)}}><SearchIcon className="size-4"/><input type="search" name="q" aria-label="Search beats and producers" maxLength={160} placeholder="Search beats, producers, genres…"/><kbd>↵</kbd></form>
      <DashboardUserMenu user={user} workspace={workspace} />
    </header>
  );
}
