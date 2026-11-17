import { TrackDetail } from "@/components/marketplace/TrackDetail";
import { PublicShell } from "@/components/public/PublicShell";
export default async function TrackPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <PublicShell><div className="mx-auto max-w-7xl px-5 py-7 sm:py-10"><TrackDetail id={id} /></div></PublicShell>; }
