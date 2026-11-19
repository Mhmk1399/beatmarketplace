import { notFound } from "next/navigation";

import { DashboardPlaceholder } from "@/components/dashboard/DashboardPlaceholder";
import { ContractsWorkspace } from "@/components/studio/ContractsWorkspace";
import { TracksWorkspace } from "@/components/studio/TracksWorkspace";
import { DiscountsWorkspace } from "@/components/studio/DiscountsWorkspace";
import { ProfileWorkspace, SettingsWorkspace } from "@/components/dashboard/AccountForms";
import { OrdersWorkspace } from "@/components/dashboard/OrdersWorkspace";
import { getNavigationItem } from "@/lib/dashboard/navigation";
import { getWorkspace } from "@/lib/dashboard/workspaces";
import { BeatAnalyticsWorkspace } from "@/components/dashboard/BeatAnalyticsWorkspace";

export default async function StudioSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "analytics") return <BeatAnalyticsWorkspace />;
  if (section === "profile") return <ProfileWorkspace producer />;
  if (section === "settings") return <SettingsWorkspace />;
  if (section === "sales") return <OrdersWorkspace scope="producer" />;
  if (section === "tracks") return <TracksWorkspace />;
  if (section === "contracts") return <ContractsWorkspace />;
  if (section === "discounts") return <DiscountsWorkspace />;
  const item = getNavigationItem("producer", `/studio/${section}`);
  if (!item) notFound();
  return <DashboardPlaceholder item={item} workspace={getWorkspace("producer")} />;
}
