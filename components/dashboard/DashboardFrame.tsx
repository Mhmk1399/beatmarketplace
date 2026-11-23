"use client";

import { useCallback, useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardMobileNav } from "@/components/dashboard/DashboardMobileNav";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardBottomNav } from "@/components/dashboard/DashboardBottomNav";
import { isNavigationItemActive, type NavigationSection } from "@/lib/dashboard/navigation";
import type { DashboardUser } from "@/lib/dashboard/session";
import type { WorkspaceDefinition } from "@/lib/dashboard/workspaces";
import "./workspace.css";

export function DashboardFrame({ children, navigation, user, workspace, workspaces }: {
  children: ReactNode; navigation: readonly NavigationSection[]; user: DashboardUser;
  workspace: WorkspaceDefinition; workspaces: readonly WorkspaceDefinition[];
}) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const navigationId = useId();
  const closeNavigation = useCallback(() => setNavigationOpen(false), []);
  const openNavigation = useCallback(() => setNavigationOpen(true), []);
  const pathname = usePathname();
  const currentSection = navigation.find(section => section.label && section.items.some(item => isNavigationItemActive(pathname, item, workspace.href)));

  return <div className="dashboard-canvas page-shell min-h-dvh">
    <a className="dashboard-skip-link" href="#dashboard-content">Skip to workspace content</a>
    <DashboardHeader navigation={navigation} navigationId={navigationId} navigationOpen={navigationOpen} onOpenNavigation={openNavigation} user={user} workspace={workspace} workspaces={workspaces} />
    <div className="dashboard-workstation">
      <aside className="dashboard-sidebar-shell hidden lg:block">
        <DashboardSidebar activeWorkspace={workspace} navigation={navigation} user={user} workspaces={workspaces} />
      </aside>
      <div className="min-w-0">
        {currentSection && currentSection.items.length > 1 && <nav aria-label={`${currentSection.label} sections`} className="dashboard-section-tabs">{currentSection.items.map(item => <Link key={item.href} href={item.href} prefetch={false} aria-current={isNavigationItemActive(pathname,item,workspace.href) ? "page" : undefined}>{item.label}</Link>)}</nav>}
        <main id="dashboard-content" tabIndex={-1} className="dashboard-main"><div className="mx-auto w-full max-w-[100rem]">{children}</div></main>
      </div>
    </div>
    <DashboardMobileNav activeWorkspace={workspace} id={navigationId} navigation={navigation} onClose={closeNavigation} open={navigationOpen} user={user} workspaces={workspaces} />
    <DashboardBottomNav workspace={workspace.id} onMore={openNavigation} />
  </div>;
}
