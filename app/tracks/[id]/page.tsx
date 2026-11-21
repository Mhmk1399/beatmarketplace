import { TrackDetail } from "@/components/marketplace/TrackDetail";
import { PublicShell } from "@/components/public/PublicShell";
import { notFound } from "next/navigation";
export default async function TrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  return (
    <PublicShell overlayNavbar>
      <div className="track-detail-route">
        <TrackDetail key={id} id={id} />
      </div>
    </PublicShell>
  );
}
