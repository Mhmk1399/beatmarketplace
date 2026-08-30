import { notFound } from "next/navigation";

import { DashboardPlaceholder } from "@/components/dashboard/DashboardPlaceholder";
import { getNavigationItem } from "@/lib/dashboard/navigation";
import { getWorkspace } from "@/lib/dashboard/workspaces";

export default async function StudioSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const item = getNavigationItem("producer", `/studio/${section}`);
  if (!item) notFound();
  return <DashboardPlaceholder item={item} workspace={getWorkspace("producer")} />;
}
