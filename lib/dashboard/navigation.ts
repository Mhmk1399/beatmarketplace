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
    { label: "Your music", items: [
      { label: "Saved beats", href: "/dashboard/favorites", icon: "tracks" },
      { label: "Purchases", href: "/dashboard/orders", icon: "contracts" },
    ] },
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
        { label: "Tracks", href: "/studio/tracks", icon: "tracks", description: "Upload tracks and choose the 30-second preview buyers hear." },
        { label: "Contracts", href: "/studio/contracts", icon: "contracts", description: "Set license prices in toman and define usage limits." },
        { label: "Discounts", href: "/studio/discounts", icon: "genres", description: "Schedule a discount for a track and manage its start and end time." },
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
    { label: "Homepage", items: [{ label: "Hero placements", href: "/admin/hero", icon: "store", description: "Select and schedule sponsored beats for the homepage hero." }] },
    {
      label: "Platform",
      items: [{ label: "Users", href: "/admin/users", icon: "users", description: "User administration is intentionally postponed." }],
    },
    {
      label: "Catalog",
      items: [
        { label: "Genres", href: "/admin/genres", icon: "genres", description: "Create, edit and manage marketplace genres." },
        { label: "Moods", href: "/admin/moods", icon: "moods", description: "Create, edit and manage moods." },
        { label: "Instruments", href: "/admin/instruments", icon: "instruments", description: "Create, edit and manage instruments." },
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
