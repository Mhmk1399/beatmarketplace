"use client";

import { useCallback, useState } from "react";
import { ProducerPageEditor } from "@/components/producers/ProducerPageEditor";
import { DynamicModal } from "@/components/ui/dynamic/DynamicModal";
import { TableIdentity } from "@/components/ui/dynamic/DynamicTable";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { NeumorphicSurface } from "@/components/ui/neumorphic/Surface";
import { formatPersianDate } from "@/lib/date-time";
import type { WorkspaceUser } from "@/lib/workspace/types";
import { ResourceManager, type ResourceConfig } from "./ResourceManager";
import { UserEditor } from "./UserEditor";

function ProducerEditor({ item, onClose, onSaved }: { item: WorkspaceUser; onClose: () => void; onSaved: () => void }) {
  const [account, setAccount] = useState(item), [avatarRevision, setAvatarRevision] = useState(0);
  const [profileBusy, setProfileBusy] = useState(false), [accountBusy, setAccountBusy] = useState(false);
  const mergeAccount = useCallback((user: WorkspaceUser) => {
    if (user.id !== item.id) return;
    // A profile request may finish after the account has already been saved.
    setAccount(current => user.version > current.version ? user : current);
  }, [item.id]);
  const endpoint = `/api/admin/producers/${item.id}`, busy = profileBusy || accountBusy;
  return <DynamicModal open size="xl" title={`Edit producer · ${account.displayName || `${account.firstName} ${account.lastName}`}`} description="Save public profile changes and account changes in their own panels." onClose={() => { if (!busy) onClose(); }} closeOnBackdrop={!busy} footer={<NeumorphicButton disabled={busy} onClick={onClose}>Close</NeumorphicButton>}>
    <div className="min-w-0 space-y-6">
      <ProducerPageEditor key={item.id} endpoint={endpoint} featuredBeatsEndpoint={`${endpoint}/beats`} featuredBeatLookupEndpoint={`${endpoint}/beats`} avatarRevision={avatarRevision} admin disabled={accountBusy} onAccountLoaded={mergeAccount} onBusyChange={setProfileBusy} />
      <NeumorphicSurface className="min-w-0 rounded-[var(--radius-card)] p-5 sm:p-7">
        <h2 className="text-xl font-extrabold">Account identity and access</h2>
        <p className="mt-2 mb-6 text-sm leading-6 text-muted">Manage the producer’s account name, username, profile image, contact details and access.</p>
        <UserEditor key={`${account.id}:${account.version}`} item={account} embedded disabled={profileBusy} onClose={onClose} onBusyChange={setAccountBusy} onSaved={user => { mergeAccount(user); if (!user.roles.includes("PRODUCER")) onSaved(); else setAvatarRevision(value => value + 1); }} />
      </NeumorphicSurface>
    </div>
  </DynamicModal>;
}

const config: ResourceConfig<WorkspaceUser> = {
  title: "Producers",
  description: "Manage producer accounts and their public studio pages, including suspended and deactivated producers.",
  endpoint: "/api/admin/producers",
  label: user => user.displayName || `${user.firstName} ${user.lastName}`,
  canEdit: true,
  columns: [
    { id: "producer", header: "Producer", cell: user => <TableIdentity image={user.avatarUrl} title={user.displayName || `${user.firstName} ${user.lastName}`} subtitle={user.username ? `@${user.username}` : user.email} /> },
    { id: "email", header: "Email", accessor: "email" },
    { id: "status", header: "Account status", accessor: "status" },
    { id: "joined", header: "Joined", cell: user => formatPersianDate(user.createdAt) },
  ],
  editor: ({ item, onClose, onSaved }) => item && <ProducerEditor key={item.id} item={item} onClose={onClose} onSaved={onSaved} />,
};

export function ProducersWorkspace() { return <ResourceManager config={config} />; }
