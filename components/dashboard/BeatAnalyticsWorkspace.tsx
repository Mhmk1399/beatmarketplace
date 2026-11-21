"use client";

import { ResourceManager, type ResourceConfig } from "@/components/admin/ResourceManager";
import { TableIdentity } from "@/components/ui/dynamic/DynamicTable";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { formatPersianDate } from "@/lib/date-time";
import type { BeatAnalytics } from "@/lib/analytics/types";

export function BeatAnalyticsWorkspace({ admin = false }: { admin?: boolean }) {
  const config: ResourceConfig<BeatAnalytics> = {
    title: "Beat audience", description: "Views count visible beat-page visits lasting at least two seconds, with a 30-minute repeat limit. Visitors are distinct browsers per beat, excluding your own previews. Use Refresh to load the latest counts.",
    endpoint: "/api/workspace/track-analytics", query: `scope=${admin ? "admin" : "producer"}`, label: track => track.title,
    columns: [
      { id: "beat", header: "Beat", cell: track => <TableIdentity image={track.artworkUrl} title={track.title} subtitle={`${track.status} · ${track.visibility}`} /> },
      { id: "views", header: "Views", cell: track => track.views.toLocaleString("en-US") },
      { id: "visitors", header: "Unique visitors", cell: track => track.uniqueVisitors.toLocaleString("en-US") },
      { id: "lastViewed", header: "Last view", cell: track => track.lastViewedAt ? formatPersianDate(track.lastViewedAt) : "No views yet" },
      { id: "open", header: "Open", cell: track => <NeumorphicLink href={track.status === "PUBLISHED" && track.visibility === "PUBLIC" ? `/tracks/${track.id}` : admin ? "/admin/beats" : "/studio/tracks"} size="sm" variant="quiet">{track.status === "PUBLISHED" && track.visibility === "PUBLIC" ? "View beat" : "Manage beat"}</NeumorphicLink> },
    ],
  };
  return <ResourceManager config={config} />;
}
