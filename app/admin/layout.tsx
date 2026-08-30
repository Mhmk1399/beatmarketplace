import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DashboardWorkspaceLayout } from "@/components/dashboard/DashboardWorkspaceLayout";

export const metadata: Metadata = { title: "Admin workspace" };

export default function AdminWorkspaceLayout({ children }: { children: ReactNode }) {
  return <DashboardWorkspaceLayout workspaceId="admin">{children}</DashboardWorkspaceLayout>;
}
