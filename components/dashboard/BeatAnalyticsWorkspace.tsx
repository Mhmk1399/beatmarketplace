"use client";

import { useState } from "react";
import { ResourceManager, type ResourceConfig } from "@/components/admin/ResourceManager";
import { TableIdentity } from "@/components/ui/dynamic/DynamicTable";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { formatPersianDate } from "@/lib/date-time";
import { trackHref } from "@/lib/marketplace/track-url";
import type { BeatAnalytics } from "@/lib/analytics/types";
import { DynamicSelect } from "@/components/ui/dynamic/DynamicSelect";

type AnalyticsSummary = { totalViews: number; uniqueVisitors: number; highestViewed: { title: string; views: number } | null; viewedTracks: number; totalTracks: number };

export function BeatAnalyticsWorkspace({ admin = false }: { admin?: boolean }) {
  const [sort, setSort] = useState("views");
  const config: ResourceConfig<BeatAnalytics> = {
    title: "Beat audience", description: "Views count visible beat-page visits lasting at least two seconds, with a 30-minute repeat limit. Visitors are distinct browsers per beat. Your visits to your own beats are excluded.",
    endpoint: "/api/workspace/track-analytics", query: `scope=${admin ? "admin" : "producer"}`, label: track => track.title,
    refreshOnReturn: true,
    columns: [
      { id: "beat", header: "Beat", cell: track => <TableIdentity image={track.artworkUrl} title={track.title} subtitle={`${track.status} · ${track.visibility}`} /> },
      { id: "views", header: "Views", sort: { active: sort === "views", onClick: () => setSort("views"), label: "Sort beats by views, highest first" }, cell: track => track.views.toLocaleString("en-US") },
      { id: "visitors", header: "Unique visitors", sort: { active: sort === "visitors", onClick: () => setSort("visitors"), label: "Sort beats by unique visitors, highest first" }, cell: track => track.uniqueVisitors.toLocaleString("en-US") },
      { id: "lastViewed", header: "Last view", cell: track => track.lastViewedAt ? formatPersianDate(track.lastViewedAt) : "No views yet" },
      { id: "open", header: "Open", cell: track => <NeumorphicLink href={track.status === "PUBLISHED" && track.visibility === "PUBLIC" ? trackHref(track) : admin ? "/admin/beats" : "/studio/tracks"} size="sm" variant="quiet">{track.status === "PUBLISHED" && track.visibility === "PUBLIC" ? "View beat" : "Manage beat"}</NeumorphicLink> },
    ],
  };
  return <ResourceManager config={config} />;
}
