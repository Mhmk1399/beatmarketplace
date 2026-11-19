import type { Metadata } from "next";
import { PublicShell } from "@/components/public/PublicShell";
import { AboutHero } from "@/components/about/AboutHero";
import { AboutWhatWeDo } from "@/components/about/AboutWhatWeDo";
import { AboutCommunity } from "@/components/about/AboutCommunity";
import "@/components/about/about.css";

export const metadata: Metadata = { title: "About us", description: "A home for independent sound. Discover BeatMarketplace, our tools for music creators, and the community behind original music." };

export default function AboutPage() {
  return <PublicShell><div className="about-page"><AboutHero /><AboutWhatWeDo /><AboutCommunity /></div></PublicShell>;
}
