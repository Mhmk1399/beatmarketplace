import type { WorkspaceId } from "@/lib/dashboard/workspaces";

export type DashboardIconName =
  | "overview"
  | "profile"
  | "settings"
  | "tracks"
  | "contracts"
  | "store"
  | "users"
  | "genres"
  | "moods"
  | "instruments";

export type NavigationItem = {
  label: string;
  href: string;
  icon: DashboardIconName;
  description?: string;
};

export type NavigationSection = {
  label?: string;
  items: readonly NavigationItem[];
};

const navigationByWorkspace: Record<WorkspaceId, readonly NavigationSection[]> = {
  personal: [
    { items: [{ label: "Overview", href: "/dashboard", icon: "overview" }] },
    {
      label: "Account",
      items: [
        { label: "Profile", href: "/dashboard/profile", icon: "profile", description: "Profile editing is the next account milestone." },
        { label: "Settings", href: "/dashboard/settings", icon: "settings", description: "Account preferences are not implemented yet." },
      ],
    },
  ],
  producer: [
    { items: [{ label: "Overview", href: "/studio", icon: "overview" }] },
    {
      label: "Catalog",
      items: [
        { label: "Tracks", href: "/studio/tracks", icon: "tracks", description: "Track management will be implemented in a later milestone." },
        { label: "Contracts", href: "/studio/contracts", icon: "contracts", description: "Contract management will be implemented in a later milestone." },
      ],
    },
    {
      label: "Store",
      items: [{ label: "Producer Profile", href: "/studio/profile", icon: "store", description: "Producer profile editing is not part of this shell milestone." }],
    },
    {
      label: "Account",
      items: [{ label: "Settings", href: "/studio/settings", icon: "settings", description: "Studio preferences are not implemented yet." }],
    },
  ],
  admin: [
    { items: [{ label: "Overview", href: "/admin", icon: "overview" }] },
    {
      label: "Platform",
      items: [{ label: "Users", href: "/admin/users", icon: "users", description: "User administration is intentionally postponed." }],
    },
    {
      label: "Catalog",
      items: [
        { label: "Genres", href: "/admin/genres", icon: "genres", description: "Genre administration is intentionally postponed." },
        { label: "Moods", href: "/admin/moods", icon: "moods", description: "Mood administration is intentionally postponed." },
        { label: "Instruments", href: "/admin/instruments", icon: "instruments", description: "Instrument administration is intentionally postponed." },
      ],
    },
    {
      label: "Account",
      items: [{ label: "Settings", href: "/admin/settings", icon: "settings", description: "Admin preferences are not implemented yet." }],
    },
  ],
};

export function getNavigation(workspaceId: WorkspaceId) {
  return navigationByWorkspace[workspaceId];
}

export function getNavigationItems(workspaceId: WorkspaceId) {
  return getNavigation(workspaceId).flatMap((section) => section.items);
}

export function getNavigationItem(workspaceId: WorkspaceId, pathname: string) {
  const items = getNavigationItems(workspaceId);
  return items.find((item) => item.href === pathname);
}

export function isNavigationItemActive(pathname: string, item: NavigationItem, workspaceRoot: string) {
  if (item.href === workspaceRoot) return pathname === workspaceRoot;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
