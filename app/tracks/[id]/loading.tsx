import { PublicShell } from "@/components/public/PublicShell";
import { TrackDetailSkeleton } from "@/components/marketplace/TrackDetailSkeleton";

export default function LoadingTrackPage() {
  return <PublicShell overlayNavbar><div className="track-detail-route"><TrackDetailSkeleton /></div></PublicShell>;
}
