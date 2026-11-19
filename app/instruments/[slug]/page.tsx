import { DiscoveryDetailPage, discoveryMetadata } from "@/components/discovery/DiscoveryPage";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) { return discoveryMetadata("instruments", (await params).slug); }
export default async function InstrumentPage({ params }: Props) { return <DiscoveryDetailPage kind="instruments" slug={(await params).slug} />; }
