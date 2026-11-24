"use client";
import { ResourceManager, type ResourceConfig } from "@/components/admin/ResourceManager";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { formatPersianDate } from "@/lib/date-time";

type Asset = { id: string; trackId: string; trackTitle: string; role: string; originalFileName: string; mimeType: string; sizeBytes: number; uploadedAt: string };
type Summary = { tracks: number; assets: number; bytes: number };
const bytes = (value: number) => value < 1024 ? `${value} B` : value < 1024 ** 2 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1024 ** 2).toFixed(1)} MB`;
export function FileStorageWorkspace() {
  const config: ResourceConfig<Asset> = { title: "File Storage", description: "A safe inventory of files attached to your tracks. Protected storage locations and download links are never displayed.", endpoint: "/api/workspace/files", itemsKey: "assets", searchable: false, label: asset => asset.originalFileName,
    summary: (result, state) => { const summary = result?.summary as Summary | undefined; const text = (value: string) => state.loading ? "Loading…" : state.error ? "Unavailable" : value; return <section className="workspace-summary-grid" aria-label="Storage summary"><article className="workspace-summary-card"><span>Tracks with inventory</span><strong>{text(String(summary?.tracks ?? 0))}</strong></article><article className="workspace-summary-card"><span>Managed assets</span><strong>{text(String(summary?.assets ?? 0))}</strong></article><article className="workspace-summary-card"><span>Recorded size</span><strong>{text(bytes(summary?.bytes ?? 0))}</strong></article></section>; },
    columns: [{ id: "track", header: "Track", accessor: "trackTitle" }, { id: "role", header: "Asset role", accessor: "role" }, { id: "file", header: "Original filename", accessor: "originalFileName" }, { id: "type", header: "Type", accessor: "mimeType" }, { id: "size", header: "Size", cell: item => bytes(item.sizeBytes) }, { id: "uploaded", header: "Uploaded", cell: item => formatPersianDate(item.uploadedAt) }, { id: "edit", header: "Safe action", cell: item => <NeumorphicLink href={`/studio/tracks?edit=${item.trackId}`} size="sm" variant="quiet">Manage track</NeumorphicLink> }],
    details: item => <div className="space-y-3 text-sm"><p><strong>{item.trackTitle}</strong></p><p className="text-muted">{item.role} · {item.mimeType} · {bytes(item.sizeBytes)}</p><p className="break-words">{item.originalFileName}</p><p className="text-xs text-muted">Uploaded {formatPersianDate(item.uploadedAt)}</p><NeumorphicLink href={`/studio/tracks?edit=${item.trackId}`}>Manage track</NeumorphicLink></div> };
  return <ResourceManager config={config} />;
}
