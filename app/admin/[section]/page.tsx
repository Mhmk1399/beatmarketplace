import { notFound } from "next/navigation";

import { DashboardPlaceholder } from "@/components/dashboard/DashboardPlaceholder";
import { TaxonomyWorkspace } from "@/components/admin/TaxonomyWorkspace";
import { HeroWorkspace } from "@/components/admin/HeroWorkspace";
import { ContactInbox } from "@/components/admin/ContactInbox";
import { UsersWorkspace } from "@/components/admin/UsersWorkspace";
import { ProducersWorkspace } from "@/components/admin/ProducersWorkspace";
import { BeatsWorkspace } from "@/components/dashboard/BeatsWorkspace";
import { OrdersWorkspace } from "@/components/dashboard/OrdersWorkspace";
import { ProfileWorkspace, SettingsWorkspace } from "@/components/dashboard/AccountForms";
import { WorkspaceOverview } from "@/components/dashboard/WorkspaceOverview";
import { SystemWorkspace } from "@/components/admin/SystemWorkspace";
import { getNavigationItem } from "@/lib/dashboard/navigation";
import { getWorkspace } from "@/lib/dashboard/workspaces";
import { BeatAnalyticsWorkspace } from "@/components/dashboard/BeatAnalyticsWorkspace";

export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "analytics") return <BeatAnalyticsWorkspace admin />;
  if (section === "users") return <UsersWorkspace />;
  if (section === "producers") return <ProducersWorkspace />;
  if (section === "system") return <SystemWorkspace />;
  if (section === "beats") return <BeatsWorkspace admin />;
  if (section === "orders") return <OrdersWorkspace scope="admin" />;
  if (section === "profile") return <ProfileWorkspace />;
  if (section === "settings") return <SettingsWorkspace admin />;
  if (section === "reports") return <WorkspaceOverview workspace="admin" />;
  if (section === "hero") return <HeroWorkspace />;
  if (section === "contact") return <ContactInbox />;
  if (section === "genres" || section === "moods" || section === "instruments") return <TaxonomyWorkspace kind={section} />;
  const item = getNavigationItem("admin", `/admin/${section}`);
  if (!item) notFound();
  return <DashboardPlaceholder item={item} workspace={getWorkspace("admin")} />;
}
