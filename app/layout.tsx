// Root layout for the BeatMarketplace app.
// This keeps the app offline-safe by avoiding external font downloads during builds.
import type { Metadata } from "next";
import { configuredAppOrigin } from "@/lib/config";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { ToastProvider } from "@/components/ui/toast/ToastProvider";
import { MarketplaceProvider } from "@/components/marketplace/MarketplaceProvider";
import { AudioPlayerProvider } from "@/components/audio/AudioPlayerProvider";
import { PlayerDock } from "@/components/audio/PlayerDock";
import { GlobalLoadingProvider } from "@/components/ui/dynamic/GlobalLoading";
import { TableCacheProvider } from "@/components/ui/dynamic/TableCacheProvider";
import "@/components/ui/dynamic/dynamic.css";

import "./globals.css";
import "@/components/audio/player.css";
import "@/components/home/music-home.css";
import "@/components/home/hero-backdrop.css";
import "@/components/home/hero-featured.css";
import "@/components/home/listening-room.css";
import "@/components/home/trending-beats.css";
import "@/components/home/genre-explorer.css";
import "@/components/discounts/discount.css";
import "@/components/marketplace/catalog.css";
import "@/components/marketplace/marketplace-browser.css";
import "@/components/marketplace/track-detail.css";

export const metadata: Metadata = {
  metadataBase: configuredAppOrigin(),
  title: {
    default: "BeatMarketplace — Find your next sound",
    template: "%s — BeatMarketplace",
  },
  description:
    "Discover original tracks, connect with producers, and build the sound behind your next release.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full font-sans">
        <ToastProvider>
          <AuthProvider>
            <TableCacheProvider>
            <AudioPlayerProvider>
              <GlobalLoadingProvider><MarketplaceProvider>
                {children}
                <PlayerDock />
              </MarketplaceProvider></GlobalLoadingProvider>
            </AudioPlayerProvider>
            </TableCacheProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
