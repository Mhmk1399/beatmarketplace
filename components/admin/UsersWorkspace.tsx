"use client";

import { formatPersianDate } from "@/lib/date-time";
import { ResourceManager, type ResourceConfig } from "./ResourceManager";
import { UserEditor } from "./UserEditor";
import { TableIdentity } from "@/components/ui/dynamic/DynamicTable";
import type { WorkspaceUser } from "@/lib/workspace/types";
const config: ResourceConfig<WorkspaceUser> = {
  title: "Users", description: "Manage customer, producer and administrator accounts. Orders remain available when an account is deactivated.", endpoint: "/api/admin/users", label: user => `${user.firstName} ${user.lastName}`, canCreate: true, canEdit: true, canDelete: true, createLabel: "Create user", deleteLabel: "Deactivate", deleteDescription: "This disables sign-in and public producer listings. The account and its orders are retained. You can reactivate it from Edit.",
  columns: [{ id: "user", header: "User", cell: user => <TableIdentity image={user.avatarUrl} title={`${user.firstName} ${user.lastName}`} subtitle={user.email} /> }, { id: "roles", header: "Access", cell: user => <span className="workspace-status">{user.roles.join(" · ")}</span> }, { id: "status", header: "Status", accessor: "status" }, { id: "joined", header: "Joined", cell: user => formatPersianDate(user.createdAt) }],
  editor: props => <UserEditor {...props} />,
};
export function UsersWorkspace() { return <ResourceManager config={config} />; }
