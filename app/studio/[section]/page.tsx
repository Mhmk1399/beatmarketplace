import { notFound } from "next/navigation";

import { DashboardPlaceholder } from "@/components/dashboard/DashboardPlaceholder";
import { ContractsWorkspace } from "@/components/studio/ContractsWorkspace";
import { TracksWorkspace } from "@/components/studio/TracksWorkspace";
import { DiscountsWorkspace } from "@/components/studio/DiscountsWorkspace";
import { getNavigationItem } from "@/lib/dashboard/navigation";
import { getWorkspace } from "@/lib/dashboard/workspaces";

export default async function StudioSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "tracks") return <TracksWorkspace />;
  if (section === "contracts") return <ContractsWorkspace />;
  if (section === "discounts") return <DiscountsWorkspace />;
  const item = getNavigationItem("producer", `/studio/${section}`);
  if (!item) notFound();
  return <DashboardPlaceholder item={item} workspace={getWorkspace("producer")} />;
}
