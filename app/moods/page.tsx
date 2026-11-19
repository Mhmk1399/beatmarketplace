import type { Metadata } from "next";
import { DiscoveryIndexPage } from "@/components/discovery/DiscoveryPage";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Explore by mood", description: "Find original beats by mood. Follow your feeling and discover your next sound." };
export default function MoodsPage() { return <DiscoveryIndexPage kind="moods" />; }
