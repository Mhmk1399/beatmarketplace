"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { DashboardPageIntro } from "@/components/dashboard/DashboardPageIntro";
import { DiscIcon, PlusIcon } from "@/components/ui/icons";
import { NeumorphicButton, NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { NeumorphicSurface } from "@/components/ui/neumorphic/Surface";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { TrackEditor } from "@/components/studio/TrackEditor";
import { useAudioActions, useAudioTransport } from "@/components/audio/AudioPlayerProvider";
import { marketplaceAudioTrack } from "@/lib/audio/marketplace-track";
import { apiRequest, errorMessage, formatTime, RequestError } from "@/components/studio/shared";
import type { MarketplaceTrack, TaxonomyItem } from "@/lib/marketplace/types";

export function TracksWorkspace() {
  const [tracks, setTracks] = useState<MarketplaceTrack[]>([]);
  const [genres, setGenres] = useState<TaxonomyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<{ track: MarketplaceTrack | null } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState([""]);
  const cursor = cursorHistory[page - 1] || "";
  const toast = useToast();
  const audio = useAudioActions();
  const transport = useAudioTransport();

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const [catalog, taxonomy] = await Promise.all([
        apiRequest<{ tracks: MarketplaceTrack[]; hasMore: boolean; nextCursor: string | null }>(`/api/tracks?mine=1&pagination=cursor&pageSize=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`, { signal }),
        apiRequest<{ items: TaxonomyItem[] }>("/api/taxonomy?kind=genres", { signal }),
      ]);
      setTracks(catalog.tracks); setHasMore(catalog.hasMore); setNextCursor(catalog.nextCursor); setGenres(taxonomy.items); setError("");
    } catch (error) { if (!signal?.aborted) setError(errorMessage(error)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [cursor]);

  useEffect(() => { const controller = new AbortController(); void Promise.resolve().then(() => { if (!controller.signal.aborted) return load(controller.signal); }); return () => controller.abort(); }, [load]);
  const closeEditor = useCallback(() => setEditor(null), []);
  const saved = useCallback(() => { setEditor(null); void load(); }, [load]);

  async function archive(track: MarketplaceTrack) {
    setBusyId(track.id);
    try { await apiRequest(`/api/tracks/${track.id}`, { method: "DELETE" }); toast.success("Track archived", "You can restore it from Edit track."); await load(); }
    catch (error) { toast.error("Could not archive track", errorMessage(error)); }
    finally { setBusyId(null); }
  }

  return <div className="space-y-7">
    <DashboardPageIntro eyebrow="Your catalog" title="Tracks" description="Upload once, choose your best 30 seconds, and give every track clear licensing options." action={<NeumorphicButton variant="accent" onClick={() => setEditor({ track: null })}><PlusIcon className="size-4" /> Upload track</NeumorphicButton>} />
    <div className="neo-inset flex flex-col justify-between gap-3 rounded-[var(--radius-control)] px-5 py-4 text-sm sm:flex-row sm:items-center"><p className="text-[var(--muted)]">Buyers hear only your selected preview. Masters stay private.</p><NeumorphicLink href="/studio/contracts" size="sm">Manage licenses</NeumorphicLink></div>
    {error ? <RequestError message={error} retry={() => void load()} /> : loading ? <NeumorphicSurface className="rounded-[var(--radius-card)] p-8"><p role="status" className="text-sm text-[var(--muted)]">Loading your tracks…</p></NeumorphicSurface> : tracks.length === 0 ? <NeumorphicSurface className="rounded-[var(--radius-card)] p-8 sm:p-12"><DiscIcon className="size-10 text-[var(--accent-text)]" /><h3 className="mt-5 text-xl font-bold">Your next release starts here</h3><p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">Add a full WAV master and select the section buyers will hear. Save a draft while you prepare artwork, then publish when you are ready.</p><NeumorphicButton variant="accent" className="mt-6" onClick={() => setEditor({ track: null })}>Upload your first track</NeumorphicButton></NeumorphicSurface> : <>
      <div className="space-y-4">{tracks.map((track) => <NeumorphicSurface key={track.id} className="rounded-[var(--radius-card)] p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4"><div className="neo-inset flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-control)]">{track.artworkUrl ? <span role="img" aria-label={`${track.title} artwork`} className="size-full bg-cover bg-center" style={{ backgroundImage: `url("${track.artworkUrl}")` }} /> : <DiscIcon className="size-7 text-[var(--accent-text)]" />}</div><div className="min-w-0"><h3 className="truncate font-extrabold text-[var(--text)]">{track.title}</h3><p className="mt-1 text-xs text-[var(--muted)]">{track.bpm} BPM · {track.musicalKey} · {track.genre?.name ?? "No genre"}</p><p className="mt-2 text-xs text-[var(--accent-text)]">{track.status.toLowerCase()} · {track.visibility.toLowerCase()} · {track.licenses.length}{track.hasMoreLicenses ? "+" : ""} active {track.licenses.length === 1 ? "license" : "licenses"}</p></div></div>
          <div className="flex flex-wrap gap-2"><NeumorphicButton size="sm" onClick={() => setEditor({ track })}>Edit track</NeumorphicButton>{track.status !== "ARCHIVED" && <NeumorphicButton size="sm" variant="quiet" disabled={busyId === track.id} onClick={() => void archive(track)}>{busyId === track.id ? "Archiving…" : "Archive"}</NeumorphicButton>}</div>
        </div>
        {track.previewUrl && <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><NeumorphicButton size="sm" onClick={() => audio.toggle(marketplaceAudioTrack(track), tracks.filter((item) => item.previewUrl).map(marketplaceAudioTrack))} aria-label={`${transport.track?.id === track.id && transport.playing ? "Pause" : "Play"} preview of ${track.title}`}>{transport.track?.id === track.id && transport.playing ? "Pause preview" : "Play 30-second preview"}</NeumorphicButton><span className="text-xs text-[var(--muted)]">{formatTime(track.previewStartSeconds)} — {formatTime(track.previewStartSeconds + track.previewDurationSeconds)} of {formatTime(track.durationSeconds)}</span></div>}
        {track.status === "PUBLISHED" && track.visibility === "PUBLIC" && track.licenses.length === 0 && <p className="mt-4 text-xs leading-5 text-[var(--warning-text)]">Add a <Link href="/studio/contracts" className="underline underline-offset-4">license</Link> so buyers can add this track to their cart.</p>}
      </NeumorphicSurface>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-4"><p className="text-xs text-[var(--muted)]">{tracks.length} tracks on this page · page {page}</p><div className="flex gap-3"><NeumorphicButton size="sm" disabled={page === 1 || loading} onClick={() => { setLoading(true); setPage((value) => value - 1); }}>Previous</NeumorphicButton><NeumorphicButton size="sm" disabled={!hasMore || loading} onClick={() => { if (!nextCursor) return; setCursorHistory((history) => [...history.slice(0, page), nextCursor]); setLoading(true); setPage((value) => value + 1); }}>Next</NeumorphicButton></div></div>
    </>}
    {editor && <TrackEditor key={editor.track?.id ?? "new"} track={editor.track} genres={genres} onClose={closeEditor} onSaved={saved} />}
  </div>;
}
