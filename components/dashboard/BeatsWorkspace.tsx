"use client";
import { CoverImage } from "@/components/ui/CoverImage";
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
import { useSearchParams } from "next/navigation";
export function BeatsWorkspace({ admin = false }: { admin?: boolean }) {
  const [status, setStatus] = useState(""); const [visibility, setVisibility] = useState(""); const audio = useAudioActions();
  const editTrackId = useSearchParams().get("edit");
  const taxonomy = useWorkspaceData<{ items: TaxonomyItem[] }>("/api/taxonomy?kind=genres", { quiet: true });
  const genres = taxonomy.data?.items ?? [], taxonomyError = taxonomy.error ? errorMessage(taxonomy.error) : "";

  const config: ResourceConfig<MarketplaceTrack> = {
    title: admin ? "Beats" : "Tracks", description: admin ? "Manage every producer's catalog, inspect private previews and prepare releases." : "Upload your music, choose the best 30 seconds, and see what is ready to sell.", endpoint: admin ? "/api/admin/tracks" : "/api/tracks", query: admin ? status ? `status=${status}` : "" : `mine=1&pagination=cursor&pageSize=20${status ? `&status=${status}` : ""}${visibility ? `&visibility=${visibility}` : ""}${editTrackId ? `&trackId=${encodeURIComponent(editTrackId)}` : ""}`, itemsKey: admin ? "items" : "tracks", label: track => track.title,
    canCreate: true, canEdit: true, canDelete: true, createLabel: "Upload beat", deleteLabel: "Archive", deleteDescription: "This removes the beat from public discovery. Purchased files and licenses remain available to their buyers. You can restore the beat from Edit.",
    columns: [{ id: "beat", header: "Beat", cell: track => <TableIdentity image={track.artworkUrl} title={track.title} subtitle={`${track.bpm} BPM · ${track.musicalKey}${track.explicit ? " · Explicit" : ""}`} /> }, ...(admin ? [{ id: "producer", header: "Producer", accessor: "producerName" as const }] : []), { id: "status", header: "Release", cell: track => <div className="flex flex-wrap gap-2"><span className="workspace-status">{track.status}</span><span className="workspace-status">{track.visibility}</span></div> }, { id: "readiness", header: "Sales readiness", cell: track => <Readiness track={track} /> }, { id: "licenses", header: "Licenses", cell: track => <LicenseCount track={track} /> }, { id: "promotion", header: "Promotion", cell: track => track.discount ? `${track.discount.percentage}% off` : "No promotion" }, { id: "listen", header: "Preview", cell: track => <NeumorphicButton size="sm" disabled={!track.previewUrl} onClick={() => audio.toggle(marketplaceAudioTrack(track))}>Listen</NeumorphicButton> }],
    renderCard: (track, actions) => <article className="workspace-track-card"><button type="button" className="workspace-track-artwork" onClick={actions.view} aria-label={`View ${track.title}`}><CoverImage src={track.artworkUrl || ""} alt="" sizes="(max-width: 600px) 90vw, (max-width: 1200px) 40vw, 28vw" /><span className="workspace-track-badges"><span className="workspace-status">{track.status}</span><span className="workspace-status">{track.visibility}</span>{track.explicit && <span className="workspace-status">EXPLICIT</span>}</span></button><div className="workspace-track-card-content"><button type="button" className="workspace-track-title" onClick={actions.view}>{track.title}</button><p>{admin ? `${track.producerName} · ` : ""}{track.bpm} BPM · {track.musicalKey}</p><div className="workspace-track-meta"><span>{track.previewUrl ? "Preview ready" : "Preview missing"}</span><LicenseCount track={track} /><span>{track.discount ? `${track.discount.percentage}% promotion` : "No promotion"}</span></div><Readiness track={track} /><div className="workspace-track-actions"><NeumorphicButton size="sm" disabled={!track.previewUrl} onClick={()=>audio.toggle(marketplaceAudioTrack(track))} aria-label={`Listen to ${track.title}`}>Listen</NeumorphicButton><NeumorphicButton size="sm" onClick={actions.edit} aria-label={`Edit ${track.title}`}>Edit</NeumorphicButton><NeumorphicButton size="sm" variant="quiet" onClick={actions.remove} aria-label={`Archive ${track.title}`}>Archive</NeumorphicButton></div></div></article>,
    toolbar: <div className="flex flex-wrap items-end gap-3"><div className="min-w-36"><label htmlFor="beat-status" className="mb-2 block text-xs text-muted">Release status</label><DynamicSelect id="beat-status" value={status} onChange={event => setStatus(event.target.value)} options={[{ value: "", label: "All releases" }, { value: "DRAFT", label: "Drafts" }, { value: "PUBLISHED", label: "Published" }, { value: "ARCHIVED", label: "Archived" }]} /></div>{!admin && <><div className="min-w-36"><label htmlFor="beat-visibility" className="mb-2 block text-xs text-muted">Visibility</label><DynamicSelect id="beat-visibility" value={visibility} onChange={event => setVisibility(event.target.value)} options={[{ value: "", label: "Any visibility" }, { value: "PUBLIC", label: "Public" }, { value: "PRIVATE", label: "Private" }]} /></div><NeumorphicLink href="/studio/contracts" size="sm">Manage licenses</NeumorphicLink></>}</div>,
    editor: ({ item, onClose, onSaved }) => <TrackEditor track={item} genres={genres} admin={admin} onClose={onClose} onSaved={onSaved} />,
    details: track => <div className="space-y-5"><TableIdentity image={track.artworkUrl} title={track.title} subtitle={track.producerName} /><p className="whitespace-pre-wrap text-sm leading-7 text-muted">{track.description || "No description."}</p><p className="text-sm">{track.genre?.name ?? "No genre"} · {track.bpm} BPM · {track.musicalKey}</p><p className="text-xs text-muted">{track.status} · {track.visibility} · Preview starts at {track.previewStartSeconds}s</p><div className="flex flex-wrap gap-3"><NeumorphicButton disabled={!track.previewUrl} variant="accent" onClick={() => audio.toggle(marketplaceAudioTrack(track))}>Play preview</NeumorphicButton>{track.status === "PUBLISHED" && track.visibility === "PUBLIC" && <NeumorphicLink href={trackHref(track)}>View beat page</NeumorphicLink>}</div><h3 className="font-bold">Active licenses</h3>{track.licenses.length ? track.licenses.map(license => <p key={license.id} className="neo-inset rounded-xl p-3 text-sm">{license.title} · {Number(license.price).toLocaleString("en-US")} Toman</p>) : <p className="text-sm text-muted">No active license. The producer can add one in their studio.</p>}</div>,
  }; return <>{taxonomyError && <RequestError message={taxonomyError} />}<ResourceManager config={config} /></>;
}

function Readiness({ track }: { track: MarketplaceTrack }) {
  const checkoutLicense = track.hasPurchasableLicense ?? track.licenses.some(license => license.licenseType === "NON_EXCLUSIVE" && license.formats.includes("WAV"));
  const live = track.status === "PUBLISHED" && track.visibility === "PUBLIC";
  const missing = [!track.previewUrl && "preview", !checkoutLicense && "purchasable WAV license"].filter(Boolean);
  const ready = live && missing.length === 0;
  const unavailable = track.status === "ARCHIVED";
  const state = ready ? "Live & ready to sell" : unavailable ? "Archived, unavailable" : missing.length ? "Needs attention" : track.visibility === "PRIVATE" ? "Private, not live" : "Prepared, not live";
  return <div className="workspace-readiness"><span className={`workspace-status ${ready ? "workspace-status-ready" : "workspace-status-warning"}`}>{state}</span>{missing.length > 0 ? <span className="text-xs text-[var(--warning-text)]">Missing {missing.join(" + ")}</span> : !live && !unavailable && <span className="text-xs text-muted">Publish publicly to enable marketplace checkout</span>}</div>;
}

function LicenseCount({ track }: { track: MarketplaceTrack }) {
  if (!track.licenses.length) return <span className="text-[var(--warning-text)]">No active licenses</span>;
  return <span>{track.licenses.length}{track.hasMoreLicenses ? "+" : ""} active {track.hasMoreLicenses ? "licenses" : track.licenses.length === 1 ? "license" : "licenses"}</span>;
}
