import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DashboardWorkspaceLayout } from "@/components/dashboard/DashboardWorkspaceLayout";

export const metadata: Metadata = { title: "Producer Studio" };

export default function ProducerStudioLayout({ children }: { children: ReactNode }) {
  return <DashboardWorkspaceLayout workspaceId="producer">{children}</DashboardWorkspaceLayout>;
}
