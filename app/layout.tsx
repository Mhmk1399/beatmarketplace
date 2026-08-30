// Root layout for the BeatMarketplace app.
// This keeps the app offline-safe by avoiding external font downloads during builds.
import type { Metadata } from "next";

import { AuthProvider } from "@/components/auth/AuthProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BeatMarketplace — Find your next sound",
    template: "%s — BeatMarketplace",
  },
  description: "Discover original tracks, connect with producers, and build the sound behind your next release.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
