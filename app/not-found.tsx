import type { Metadata } from "next";
import { PublicShell } from "@/components/public/PublicShell";
import { NotFoundScene } from "@/components/public/NotFoundScene";
import "@/components/public/not-found.css";

export const metadata: Metadata = {
  title: "404 · Page not found",
  description: "This beat went off track. Return home, explore original beats, or get support from BeatMarketplace.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <PublicShell overlayNavbar showFooter={false}><NotFoundScene /></PublicShell>;
}
