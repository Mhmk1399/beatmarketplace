import type { Metadata } from "next";
import { DiscoveryIndexPage } from "@/components/discovery/DiscoveryPage";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Explore by instrument", description: "Discover original beats by instrument. Explore piano, guitar, synth, bass and more." };
export default function InstrumentsPage() { return <DiscoveryIndexPage kind="instruments" />; }
