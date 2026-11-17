// Root layout for the BeatMarketplace app.
// This keeps the app offline-safe by avoiding external font downloads during builds.
import type { Metadata } from "next";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { ToastProvider } from "@/components/ui/toast/ToastProvider";
import { MarketplaceProvider } from "@/components/marketplace/MarketplaceProvider";
import { AudioPlayerProvider } from "@/components/audio/AudioPlayerProvider";
import { PlayerDock } from "@/components/audio/PlayerDock";

import "./globals.css";
import "@/components/audio/player.css";
import "@/components/home/music-home.css";
import "@/components/home/hero-backdrop.css";
import "@/components/home/hero-featured.css";
import "@/components/home/listening-room.css";
import "@/components/discounts/discount.css";
import "@/components/marketplace/catalog.css";
import "@/components/marketplace/track-detail.css";

export const metadata: Metadata = {
  title: {
    default: "BeatMarketplace — Find your next sound",
    template: "%s — BeatMarketplace",
  },
  description: "Discover original tracks, connect with producers, and build the sound behind your next release.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full font-sans">
        <ToastProvider>
          <AuthProvider>
            <AudioPlayerProvider>
              <MarketplaceProvider>{children}<PlayerDock /></MarketplaceProvider>
            </AudioPlayerProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
