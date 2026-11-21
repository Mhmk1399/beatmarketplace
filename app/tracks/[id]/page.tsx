import { TrackDetail } from "@/components/marketplace/TrackDetail";
import { PublicShell } from "@/components/public/PublicShell";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { resolveTrackPage } from "@/lib/marketplace/track-page";
import { parseTrackReference, trackHref } from "@/lib/marketplace/track-url";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const track = await resolveTrackPage((await params).id);
  if (!track) notFound();
  const url = trackHref(track);
  const description = track.description?.replace(/\s+/g, " ").trim().slice(0, 170) || `Listen to ${track.title}. Preview the beat and explore producer-defined licenses.`;
  return {
    title: track.title,
    description,
    alternates: { canonical: url },
    robots: track.publicTrack ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { type: "website", siteName: "BeatMarketplace", title: track.title, description, url, ...(track.image ? { images: [{ url: track.image, alt: `${track.title} cover artwork` }] } : {}) },
    twitter: { card: track.image ? "summary_large_image" : "summary", title: track.title, description, ...(track.image ? { images: [track.image] } : {}) },
  };
}

export default async function TrackPage({
  params,
}: Props) {
  // The route parameter also accepts legacy IDs; APIs and relations keep using IDs.
  const { id: reference } = await params;
  const track = await resolveTrackPage(reference);
  if (!track) notFound();
  if (parseTrackReference(reference) !== track.slug) permanentRedirect(trackHref(track));
  return (
    <PublicShell overlayNavbar>
      <div className="track-detail-route">
        <TrackDetail key={track.id} id={track.id} initialSlug={track.slug} />
      </div>
    </PublicShell>
  );
}
