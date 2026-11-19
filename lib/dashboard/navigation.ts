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
      { label: "Downloads", href: "/dashboard/downloads", icon: "contracts" },
      { label: "Collections", href: "/dashboard/collections", icon: "store" },
    ] },
    {
      label: "Account",
      items: [
        { label: "Profile", href: "/dashboard/profile", icon: "profile", description: "Manage your account details and profile image." },
        { label: "Settings", href: "/dashboard/settings", icon: "settings", description: "Update your account security." },
      ],
    },
  ],
  producer: [
    { items: [{ label: "Overview", href: "/studio", icon: "overview" }] },
    {
      label: "Catalog",
      items: [
        { label: "Tracks", href: "/studio/tracks", icon: "tracks", description: "Upload tracks and choose the 30-second preview buyers hear." },
        { label: "Beat audience", href: "/studio/analytics", icon: "overview", description: "View page visits and unique browsers for each beat." },
        { label: "Contracts", href: "/studio/contracts", icon: "contracts", description: "Set license prices in toman and define usage limits." },
        { label: "Discounts", href: "/studio/discounts", icon: "genres", description: "Schedule a discount for a track and manage its start and end time." },
        { label: "Sales", href: "/studio/sales", icon: "contracts", description: "View verified sales of your beats." },
      ],
    },
    {
      label: "Store",
      items: [{ label: "Producer Profile", href: "/studio/profile", icon: "store", description: "Edit your producer identity and storefront." }],
    },
    {
      label: "Account",
      items: [{ label: "Settings", href: "/studio/settings", icon: "settings", description: "Manage your account security." }],
    },
  ],
  admin: [
    { items: [{ label: "Overview", href: "/admin", icon: "overview" }] },
    { label: "Support", items: [{ label: "Contact messages", href: "/admin/contact", icon: "contracts", description: "Read and manage messages received from the contact form." }] },
    { label: "Homepage", items: [{ label: "Hero placements", href: "/admin/hero", icon: "store", description: "Select and schedule sponsored beats for the homepage hero." }] },
    {
      label: "Platform",
      items: [{ label: "Users", href: "/admin/users", icon: "users", description: "Manage user profiles, roles and account status." }, { label: "Beats", href: "/admin/beats", icon: "tracks", description: "Manage the complete beat catalog." }, { label: "Beat audience", href: "/admin/analytics", icon: "overview", description: "View page visits and unique browsers for every beat." }, { label: "Orders", href: "/admin/orders", icon: "contracts", description: "Inspect verified payment records." }, { label: "Reports", href: "/admin/reports", icon: "overview", description: "Live catalog and transaction reports." }],
    },
    {
      label: "Catalog",
      items: [
        { label: "Categories", href: "/admin/genres", icon: "genres", description: "Manage music styles, thumbnails, banners and descriptions." },
        { label: "Moods", href: "/admin/moods", icon: "moods", description: "Create, edit and manage moods." },
        { label: "Instruments", href: "/admin/instruments", icon: "instruments", description: "Create, edit and manage instruments." },
      ],
    },
    {
      label: "Account",
      items: [{ label: "Profile", href: "/admin/profile", icon: "profile", description: "Edit your profile." }, { label: "Settings", href: "/admin/settings", icon: "settings", description: "Manage website contact settings and account security." }, { label: "Connections", href: "/admin/system", icon: "settings", description: "Check database and object storage access." }],
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
