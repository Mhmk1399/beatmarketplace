import { notFound, redirect } from "next/navigation";

import { ContractsWorkspace } from "@/components/studio/ContractsWorkspace";
import { TracksWorkspace } from "@/components/studio/TracksWorkspace";
import { DiscountsWorkspace } from "@/components/studio/DiscountsWorkspace";
import { ProfileWorkspace, SettingsWorkspace } from "@/components/dashboard/AccountForms";
import { OrdersWorkspace } from "@/components/dashboard/OrdersWorkspace";
import { getNavigationItem } from "@/lib/dashboard/navigation";
import { BeatAnalyticsWorkspace } from "@/components/dashboard/BeatAnalyticsWorkspace";
import { CollectionsWorkspace } from "@/components/dashboard/CollectionsWorkspace";
import { FileStorageWorkspace } from "@/components/studio/FileStorageWorkspace";
import { PromoteWorkspace } from "@/components/studio/PromoteWorkspace";
import { FinancesWorkspace } from "@/components/studio/FinancesWorkspace";
import { PhotosWorkspace } from "@/components/studio/PhotosWorkspace";
import { StudioComingSoon } from "@/components/studio/StudioComingSoon";

export default async function StudioSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "analytics") return <BeatAnalyticsWorkspace />;
  if (section === "profile") redirect("/studio/pro-page");
  if (section === "pro-page") return <ProfileWorkspace producer />;
  if (section === "settings") return <SettingsWorkspace />;
  if (section === "sales") return <OrdersWorkspace scope="producer" />;
  if (section === "tracks") return <TracksWorkspace />;
  if (section === "contracts") return <ContractsWorkspace />;
  if (section === "discounts") return <DiscountsWorkspace />;
  if (section === "files") return <FileStorageWorkspace />;
  if (section === "collections") return <CollectionsWorkspace />;
  if (section === "photos") return <PhotosWorkspace />;
  if (section === "promote") return <PromoteWorkspace />;
  if (section === "finances") return <FinancesWorkspace />;
  const item = getNavigationItem("producer", `/studio/${section}`);
  if (!item) notFound();
  if (item.availability === "coming-soon") return <StudioComingSoon slug={section} item={item} />;
  notFound();
}
