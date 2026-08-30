import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DashboardWorkspaceLayout } from "@/components/dashboard/DashboardWorkspaceLayout";

export const metadata: Metadata = { title: "Personal dashboard" };

export default function PersonalDashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardWorkspaceLayout workspaceId="personal">{children}</DashboardWorkspaceLayout>;
}
