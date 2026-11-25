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
  | "instruments"
  | "files"
  | "collections"
  | "photos"
  | "promote"
  | "finances"
  | "analytics"
  | "rights"
  | "integrations";

export type NavigationItem = {
  label: string;
  href: string;
  icon: DashboardIconName;
  description?: string;
  availability?: "live" | "limited" | "coming-soon";
  badge?: string;
};

export type NavigationSection = {
  label?: string;
  items: readonly NavigationItem[];
};

const navigationByWorkspace: Record<WorkspaceId, readonly NavigationSection[]> =
  {
    personal: [
      { items: [{ label: "Overview", href: "/dashboard", icon: "overview" }] },
      {
        label: "Your music",
        items: [
          {
            label: "Saved beats",
            href: "/dashboard/favorites",
            icon: "tracks",
          },
          { label: "Purchases", href: "/dashboard/orders", icon: "contracts" },
          {
            label: "Downloads",
            href: "/dashboard/downloads",
            icon: "contracts",
          },
          {
            label: "Collections",
            href: "/dashboard/collections",
            icon: "store",
          },
        ],
      },
      {
        label: "Account",
        items: [
          {
            label: "Profile",
            href: "/dashboard/profile",
            icon: "profile",
            description: "Manage your account details and profile image.",
          },
          {
            label: "Settings",
            href: "/dashboard/settings",
            icon: "settings",
            description: "Update your account security.",
          },
        ],
      },
    ],
    producer: [
      {
        items: [
          {
            label: "Dashboard",
            href: "/studio",
            icon: "overview",
            availability: "live",
          },
        ],
      },
      {
        label: "Catalog",
        items: [
          {
            label: "Tracks",
            href: "/studio/tracks",
            icon: "tracks",
            availability: "live",
            description:
              "Upload tracks and choose the 30-second preview buyers hear.",
          },
          {
            label: "Collaborations",
            href: "/studio/collaborations",
            icon: "users",
            availability: "live",
            description: "Review track invitations and their status.",
          },
          {
            label: "File Storage",
            href: "/studio/files",
            icon: "files",
            availability: "live",
            description:
              "Review the safe metadata for files attached to your tracks.",
          },
          {
            label: "Tracklists",
            href: "/studio/tracklists",
            icon: "collections",
            availability: "live",
          },
          {
            label: "Collections",
            href: "/studio/collections",
            icon: "collections",
            availability: "live",
            description: "Private listening and organization collections.",
          },
          {
            label: "Sound Kits",
            href: "/studio/sound-kits",
            icon: "files",
            availability: "limited",
            badge: "Limited",
          },
        ],
      },
      {
        label: "Selling",
        items: [
          {
            label: "Contracts",
            href: "/studio/contracts",
            icon: "contracts",
            availability: "live",
            description: "Set license prices in toman and define usage limits.",
          },
          {
            label: "Services",
            href: "/studio/services",
            icon: "store",
            availability: "live",
          },
          {
            label: "Discounts",
            href: "/studio/discounts",
            icon: "genres",
            availability: "live",
            description: "Schedule and manage offers for your catalog.",
          },
        ],
      },
      {
        label: "Content",
        items: [
          {
            label: "Videos",
            href: "/studio/videos",
            icon: "photos",
            availability: "live",
          },
          {
            label: "Photos",
            href: "/studio/photos",
            icon: "photos",
            availability: "live",
            description: "Manage your profile photo and studio banner.",
          },
        ],
      },
      {
        label: "Marketing",
        items: [
          {
            label: "Promote",
            href: "/studio/promote",
            icon: "promote",
            availability: "limited",
            badge: "Limited",
          },
          {
            label: "Pro Page",
            href: "/studio/pro-page",
            icon: "store",
            availability: "live",
            description: "Edit your public storefront.",
          },
        ],
      },
      {
        label: "Rights",
        items: [
          {
            label: "Publishing",
            href: "/studio/publishing",
            icon: "rights",
            availability: "coming-soon",
            badge: "Soon",
          },
          {
            label: "Beat ID",
            href: "/studio/beat-id",
            icon: "rights",
            availability: "coming-soon",
            badge: "Soon",
          },
          {
            label: "CRA",
            href: "/studio/cra",
            icon: "rights",
            availability: "coming-soon",
            badge: "Soon",
          },
        ],
      },
      {
        label: "Business",
        items: [
          {
            label: "Sales",
            href: "/studio/sales",
            icon: "contracts",
            availability: "live",
            description: "View verified sales of your beats.",
          },
          {
            label: "Finances",
            href: "/studio/finances",
            icon: "finances",
            availability: "live",
            description:
              "Review gross verified sales without invented balances.",
          },
          {
            label: "Analytics",
            href: "/studio/analytics",
            icon: "analytics",
            availability: "live",
            description: "View page visits and unique browsers for each beat.",
          },
        ],
      },
      {
        label: "Account",
        items: [
          {
            label: "Integrations",
            href: "/studio/integrations",
            icon: "integrations",
            availability: "coming-soon",
            badge: "Soon",
          },
          {
            label: "Promote Credits",
            href: "/studio/promote-credits",
            icon: "promote",
            availability: "coming-soon",
            badge: "Soon",
          },
          {
            label: "Settings",
            href: "/studio/settings",
            icon: "settings",
            availability: "live",
            description: "Manage your account security.",
          },
        ],
      },
    ],
    admin: [
      { items: [{ label: "Overview", href: "/admin", icon: "overview" }] },
      {
        label: "Support",
        items: [
          {
            label: "Contact messages",
            href: "/admin/contact",
            icon: "contracts",
            description:
              "Read and manage messages received from the contact form.",
          },
        ],
      },
      {
        label: "Homepage",
        items: [
          {
            label: "Hero placements",
            href: "/admin/hero",
            icon: "store",
            description:
              "Select and schedule sponsored beats for the homepage hero.",
          },
        ],
      },
      {
        label: "Platform",
        items: [
          {
            label: "Users",
            href: "/admin/users",
            icon: "users",
            description: "Manage user profiles, roles and account status.",
          },
          {
            label: "Producers",
            href: "/admin/producers",
            icon: "store",
            description:
              "Manage producer accounts and their public studio profiles.",
          },
          {
            label: "Beats",
            href: "/admin/beats",
            icon: "tracks",
            description: "Manage the complete beat catalog.",
          },
          {
            label: "Beat audience",
            href: "/admin/analytics",
            icon: "overview",
            description: "View page visits and unique browsers for every beat.",
          },
          {
            label: "Orders",
            href: "/admin/orders",
            icon: "contracts",
            description: "Inspect verified payment records.",
          },
          {
            label: "Reports",
            href: "/admin/reports",
            icon: "overview",
            description: "Live catalog and transaction reports.",
          },
        ],
      },
      {
        label: "Catalog",
        items: [
          {
            label: "Categories",
            href: "/admin/genres",
            icon: "genres",
            description:
              "Manage music styles, thumbnails, banners and descriptions.",
          },
          {
            label: "Moods",
            href: "/admin/moods",
            icon: "moods",
            description: "Create, edit and manage moods.",
          },
          {
            label: "Instruments",
            href: "/admin/instruments",
            icon: "instruments",
            description: "Create, edit and manage instruments.",
          },
        ],
      },
      {
        label: "Account",
        items: [
          {
            label: "Profile",
            href: "/admin/profile",
            icon: "profile",
            description: "Edit your profile.",
          },
          {
            label: "Settings",
            href: "/admin/settings",
            icon: "settings",
            description:
              "Manage website contact settings and account security.",
          },
          {
            label: "Connections",
            href: "/admin/system",
            icon: "settings",
            description: "Check database and object storage access.",
          },
        ],
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

export function isNavigationItemActive(
  pathname: string,
  item: NavigationItem,
  workspaceRoot: string,
) {
  if (item.href === workspaceRoot) return pathname === workspaceRoot;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
