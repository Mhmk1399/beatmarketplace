import type { UserRole } from "@/lib/types";

export type WorkspaceId = "personal" | "producer" | "admin";

export type WorkspaceDefinition = {
  id: WorkspaceId;
  label: string;
  shortLabel: string;
  href: "/dashboard" | "/studio" | "/admin";
  description: string;
  requiredRole?: UserRole;
};

export const WORKSPACES: readonly WorkspaceDefinition[] = [
  {
    id: "personal",
    label: "Personal",
    shortLabel: "Personal",
    href: "/dashboard",
    description: "Your account and marketplace identity",
  },
  {
    id: "producer",
    label: "Producer Studio",
    shortLabel: "Studio",
    href: "/studio",
    description: "Your catalog and producer storefront",
    requiredRole: "PRODUCER",
  },
  {
    id: "admin",
    label: "Admin",
    shortLabel: "Admin",
    href: "/admin",
    description: "Platform operations and catalog governance",
    requiredRole: "ADMIN",
  },
] as const;

export function getWorkspace(id: WorkspaceId) {
  const workspace = WORKSPACES.find((candidate) => candidate.id === id);
  if (!workspace) throw new Error(`Unknown dashboard workspace: ${id}`);
  return workspace;
}

export function canAccessWorkspace(roles: readonly UserRole[], workspace: WorkspaceDefinition) {
  return !workspace.requiredRole || roles.includes(workspace.requiredRole);
}

export function getAvailableWorkspaces(roles: readonly UserRole[]) {
  return WORKSPACES.filter((workspace) => canAccessWorkspace(roles, workspace));
}
