"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardUserMenu } from "@/components/dashboard/DashboardUserMenu";
import { WorkspaceSwitcher } from "@/components/dashboard/WorkspaceSwitcher";
import { BrandMark } from "@/components/public/BrandMark";
import { MenuIcon, SearchIcon, PlusIcon, ChevronDownIcon } from "@/components/ui/icons";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import type { NavigationSection } from "@/lib/dashboard/navigation";
import type { DashboardUser } from "@/lib/dashboard/session";
import type { WorkspaceDefinition } from "@/lib/dashboard/workspaces";

export function DashboardHeader({ navigationId, navigationOpen, onOpenNavigation, user, workspace, workspaces }: {
  navigation: readonly NavigationSection[]; navigationId: string; navigationOpen: boolean; onOpenNavigation: () => void;
  user: DashboardUser; workspace: WorkspaceDefinition; workspaces: readonly WorkspaceDefinition[];
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const createRef = useRef<HTMLDivElement>(null), createButton = useRef<HTMLButtonElement>(null);
  const createItems = workspace.id === "producer" ? [{ label: "Upload beat", detail: "Add music to your catalog", href: "/studio/tracks?create=1" }, { label: "Create license", detail: "Define your price and conditions", href: "/studio/contracts?create=1" }, { label: "Schedule discount", detail: "Plan a catalog offer", href: "/studio/discounts?create=1" }] : workspace.id === "admin" ? [{ label: "Add beat", detail: "Manage the platform catalog", href: "/admin/beats?create=1" }, { label: "Add user", detail: "Create a platform account", href: "/admin/users?create=1" }, { label: "Add category", detail: "Organize music discovery", href: "/admin/genres?create=1" }] : [{ label: "Browse beats", detail: "Find your next sound", href: "/marketplace" }, { label: "Create collection", detail: "Organize your saved music", href: "/dashboard/collections?create=1" }];
  useEffect(() => {
    if (!createOpen) return;
    createRef.current?.querySelector<HTMLAnchorElement>("[role='menuitem']")?.focus();
    const dismiss = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key === "Escape") { setCreateOpen(false); createButton.current?.focus(); }
      else if (event instanceof MouseEvent && !createRef.current?.contains(event.target as Node)) setCreateOpen(false);
    };
    document.addEventListener("mousedown", dismiss); document.addEventListener("keydown", dismiss);
    return () => { document.removeEventListener("mousedown", dismiss); document.removeEventListener("keydown", dismiss); };
  }, [createOpen]);

  return <header className="dashboard-header dashboard-topbar sticky top-0 z-30">
    <button type="button" className="neo-icon-button dashboard-mobile-trigger lg:hidden" onClick={onOpenNavigation} aria-label="Open dashboard navigation" aria-expanded={navigationOpen} aria-controls={navigationId} aria-haspopup="dialog"><MenuIcon className="size-5" /></button>
    <div className="dashboard-topbar-brand"><BrandMark compact href="/" /><WorkspaceSwitcher compact activeWorkspace={workspace} workspaces={workspaces} /></div>
    <form className="dashboard-search" onSubmit={event=>{event.preventDefault();const q=String(new FormData(event.currentTarget).get("q")??"").trim();if(q)router.push(`/marketplace?q=${encodeURIComponent(q)}`)}}><SearchIcon className="size-4"/><input type="search" name="q" aria-label="Search beats and producers" maxLength={160} placeholder="Search the marketplace…"/><kbd>↵</kbd></form>
    <div className="dashboard-topbar-actions">
      <Link href="/marketplace" prefetch={false} className="dashboard-marketplace-link">Marketplace <span aria-hidden="true">↗</span></Link>
      <div ref={createRef} className="relative">
        <NeumorphicButton ref={createButton} variant="accent" aria-haspopup="menu" aria-expanded={createOpen} onClick={()=>setCreateOpen(value=>!value)}><PlusIcon className="size-4" /><span>Create</span><ChevronDownIcon className="size-3" /></NeumorphicButton>
        {createOpen && <div role="menu" aria-label="Create content" onKeyDown={event=>{
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>("[role='menuitem']"));
          const index = items.indexOf(document.activeElement as HTMLAnchorElement);
          const next = event.key === "ArrowDown" ? (index + 1) % items.length : event.key === "ArrowUp" ? (index - 1 + items.length) % items.length : event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : -1;
          if (next >= 0) { event.preventDefault(); items[next]?.focus(); }
        }} className="dashboard-create-menu neo-raised-strong">{createItems.map(item=><Link key={item.href} href={item.href} prefetch={false} role="menuitem" onClick={()=>setCreateOpen(false)}><strong>{item.label}</strong><small>{item.detail}</small></Link>)}</div>}
      </div>
      <DashboardUserMenu user={user} workspace={workspace} />
    </div>
  </header>;
}
