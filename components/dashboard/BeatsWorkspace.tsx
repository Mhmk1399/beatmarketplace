"use client";
import { useState } from "react";
import { ResourceManager, type ResourceConfig } from "@/components/admin/ResourceManager";
import { DynamicSelect } from "@/components/ui/dynamic/DynamicSelect";
import { TableIdentity } from "@/components/ui/dynamic/DynamicTable";
import { TrackEditor } from "@/components/studio/TrackEditor";
import { useAudioActions } from "@/components/audio/AudioPlayerProvider";
import { marketplaceAudioTrack } from "@/lib/audio/marketplace-track";
import { trackHref } from "@/lib/marketplace/track-url";
import { NeumorphicButton, NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { errorMessage, RequestError } from "@/components/studio/shared";
import { useWorkspaceData } from "@/components/ui/dynamic/useWorkspaceData";
import type { MarketplaceTrack, TaxonomyItem } from "@/lib/marketplace/types";
export function BeatsWorkspace({ admin = false }: { admin?: boolean }) {
  const [status, setStatus] = useState(""); const audio = useAudioActions();
  const taxonomy = useWorkspaceData<{ items: TaxonomyItem[] }>("/api/taxonomy?kind=genres", { quiet: true });
  const genres = taxonomy.data?.items ?? [], taxonomyError = taxonomy.error ? errorMessage(taxonomy.error) : "";

  const config: ResourceConfig<MarketplaceTrack> = {
    title: admin ? "Beats" : "My beats", description: admin ? "Manage every producer's catalog, inspect private previews and prepare releases." : "Upload your music, choose the best 30 seconds, and manage each release.", endpoint: admin ? "/api/admin/tracks" : "/api/tracks", query: admin ? status ? `status=${status}` : "" : "mine=1&pagination=cursor&pageSize=20", itemsKey: admin ? "items" : "tracks", label: track => track.title,
    canCreate: true, canEdit: true, canDelete: true, createLabel: "Upload beat", deleteLabel: "Archive", deleteDescription: "This removes the beat from public discovery. Purchased files and licenses remain available to their buyers. You can restore the beat from Edit.",
    columns: [{ id: "beat", header: "Beat", cell: track => <TableIdentity image={track.artworkUrl} title={track.title} subtitle={`${track.bpm} BPM · ${track.musicalKey}`} /> }, ...(admin ? [{ id: "producer", header: "Producer", accessor: "producerName" as const }] : []), { id: "genre", header: "Genre", cell: track => track.genre?.name ?? "—" }, { id: "status", header: "Status", cell: track => <span className="workspace-status">{track.status}</span> }, { id: "listen", header: "Preview", cell: track => <NeumorphicButton size="sm" disabled={!track.previewUrl} onClick={() => audio.toggle(marketplaceAudioTrack(track))}>Listen</NeumorphicButton> }],
    toolbar: admin ? <div className="max-w-60"><label htmlFor="admin-beat-status" className="mb-2 block text-xs text-muted">Release status</label><DynamicSelect id="admin-beat-status" value={status} onChange={event => setStatus(event.target.value)} options={[{ value: "", label: "All beats" }, { value: "DRAFT", label: "Drafts" }, { value: "PUBLISHED", label: "Published" }, { value: "ARCHIVED", label: "Archived" }]} /></div> : <NeumorphicLink href="/studio/contracts" size="sm">Manage licenses</NeumorphicLink>,
    editor: ({ item, onClose, onSaved }) => <TrackEditor track={item} genres={genres} admin={admin} onClose={onClose} onSaved={onSaved} />,
    details: track => <div className="space-y-5"><TableIdentity image={track.artworkUrl} title={track.title} subtitle={track.producerName} /><p className="whitespace-pre-wrap text-sm leading-7 text-muted">{track.description || "No description."}</p><p className="text-sm">{track.genre?.name ?? "No genre"} · {track.bpm} BPM · {track.musicalKey}</p><p className="text-xs text-muted">{track.status} · {track.visibility} · Preview starts at {track.previewStartSeconds}s</p><div className="flex flex-wrap gap-3"><NeumorphicButton disabled={!track.previewUrl} variant="accent" onClick={() => audio.toggle(marketplaceAudioTrack(track))}>Play preview</NeumorphicButton>{track.status === "PUBLISHED" && track.visibility === "PUBLIC" && <NeumorphicLink href={trackHref(track)}>View beat page</NeumorphicLink>}</div><h3 className="font-bold">Active licenses</h3>{track.licenses.length ? track.licenses.map(license => <p key={license.id} className="neo-inset rounded-xl p-3 text-sm">{license.title} · {Number(license.price).toLocaleString("en-US")} Toman</p>) : <p className="text-sm text-muted">No active license. The producer can add one in their studio.</p>}</div>,
  }; return <>{taxonomyError && <RequestError message={taxonomyError} />}<ResourceManager key={status} config={config} /></>;
}
