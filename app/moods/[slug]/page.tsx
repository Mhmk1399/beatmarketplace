import { DiscoveryDetailPage, discoveryMetadata } from "@/components/discovery/DiscoveryPage";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) { return discoveryMetadata("moods", (await params).slug); }
export default async function MoodPage({ params }: Props) { return <DiscoveryDetailPage kind="moods" slug={(await params).slug} />; }
