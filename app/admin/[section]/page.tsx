import { notFound } from "next/navigation";

import { DashboardPlaceholder } from "@/components/dashboard/DashboardPlaceholder";
import { TaxonomyWorkspace } from "@/components/admin/TaxonomyWorkspace";
import { HeroWorkspace } from "@/components/admin/HeroWorkspace";
import { getNavigationItem } from "@/lib/dashboard/navigation";
import { getWorkspace } from "@/lib/dashboard/workspaces";

export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "hero") return <HeroWorkspace />;
  if (section === "genres" || section === "moods" || section === "instruments") return <TaxonomyWorkspace kind={section} />;
  const item = getNavigationItem("admin", `/admin/${section}`);
  if (!item) notFound();
  return <DashboardPlaceholder item={item} workspace={getWorkspace("admin")} />;
}
