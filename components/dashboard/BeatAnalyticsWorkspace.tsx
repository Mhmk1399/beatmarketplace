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
    title: "Beat audience", description: "Views count visible beat-page visits lasting at least two seconds, with a 30-minute repeat limit. Visitors are distinct browsers per beat, excluding your own previews. Use Refresh to load the latest counts.",
    endpoint: "/api/workspace/track-analytics", query: `scope=${admin ? "admin" : "producer"}&sort=${sort}`, pagination: "offset", label: track => track.title,
    toolbar: <div className="min-w-44"><label htmlFor="analytics-sort" className="mb-2 block text-xs text-muted">Sort audience</label><DynamicSelect id="analytics-sort" value={sort} onChange={event => setSort(event.target.value)} options={[{ value: "views", label: "Most views" }, { value: "visitors", label: "Most visitors" }, { value: "newest", label: "Newest beats" }]} /></div>,
    summary: (result, state) => { const summary = result?.summary as AnalyticsSummary | undefined; const pending = !summary && state.loading, unavailable = !summary && Boolean(state.error); const value = (ready: string) => pending ? "Loading…" : unavailable ? "Unavailable" : ready; return <section className="workspace-analytics-summary" aria-label="Audience summary" aria-busy={pending}><article><span>Total views</span><strong>{value((summary?.totalViews ?? 0).toLocaleString("en-US"))}</strong><small>Qualified beat-page visits</small></article><article><span>Per-beat unique browser total</span><strong>{value((summary?.uniqueVisitors ?? 0).toLocaleString("en-US"))}</strong><small>Unique browsers are counted separately for each beat, then summed.</small></article><article><span>Highest viewed</span><strong>{value(summary?.highestViewed ? summary.highestViewed.title : "No views yet")}</strong><small>{pending ? "Loading audience data" : unavailable ? "Audience data could not be loaded" : summary?.highestViewed ? `${summary.highestViewed.views.toLocaleString("en-US")} views` : "Share a published beat to start"}</small></article><article><span>Catalog coverage</span><strong>{value(summary?.totalTracks ? `${Math.round(summary.viewedTracks / summary.totalTracks * 100)}%` : "0%")}</strong><small>{pending ? "Loading catalog" : unavailable ? "Catalog data could not be loaded" : `${summary?.viewedTracks ?? 0} of ${summary?.totalTracks ?? 0} beats viewed`}</small></article></section>; },
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
