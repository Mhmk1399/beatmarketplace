"use client";

import Link from "next/link";

import { DashboardIcon } from "@/components/dashboard/DashboardIcon";
import { cn } from "@/lib/cn";
import { isNavigationItemActive, type NavigationItem as NavigationItemDefinition } from "@/lib/dashboard/navigation";

export function NavigationItem({
  item,
  onNavigate,
  pathname,
  workspaceRoot,
}: {
  item: NavigationItemDefinition;
  onNavigate?: () => void;
  pathname: string;
  workspaceRoot: string;
}) {
  const active = isNavigationItemActive(pathname, item, workspaceRoot);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn("dashboard-nav-item group flex min-h-11 items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold", active && "dashboard-nav-item-active")}
    >
      <DashboardIcon name={item.icon} className="size-[19px] shrink-0" />
      <span className="truncate">{item.label}</span>
      {active && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-[#b47af8] shadow-[0_0_10px_rgba(180,122,248,.75)]" aria-hidden="true" />}
    </Link>
  );
}
