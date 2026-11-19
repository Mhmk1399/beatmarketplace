import { notFound } from "next/navigation";

import { DashboardPlaceholder } from "@/components/dashboard/DashboardPlaceholder";
import { getNavigationItem } from "@/lib/dashboard/navigation";
import { getWorkspace } from "@/lib/dashboard/workspaces";
import { Catalog } from "@/components/marketplace/Catalog";
import { OrdersWorkspace } from "@/components/dashboard/OrdersWorkspace";
import { ProfileWorkspace, SettingsWorkspace } from "@/components/dashboard/AccountForms";
import { CollectionsWorkspace } from "@/components/dashboard/CollectionsWorkspace";

export default async function PersonalSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "collections") return <CollectionsWorkspace />;
  if (section === "profile") return <ProfileWorkspace />;
  if (section === "settings") return <SettingsWorkspace />;
  if (section === "downloads") return <OrdersWorkspace />;
  const item = getNavigationItem("personal", `/dashboard/${section}`);
  if (!item) notFound();
  if (section === "orders") return <OrdersWorkspace />;
  if (section === "favorites") return <div className="space-y-8"><header><h1 className="text-3xl font-black">Saved beats.</h1><p className="mt-3 text-sm text-[var(--muted)]">Keep your favorite sounds close to your next idea.</p></header><Catalog saved /></div>;
  return <DashboardPlaceholder item={item} workspace={getWorkspace("personal")} />;
}
