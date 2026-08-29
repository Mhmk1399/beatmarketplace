// Root layout for the BeatMarketplace app.
// This keeps the app offline-safe by avoiding external font downloads during builds.
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BeatMarketplace",
  description: "A modular beat marketplace MVP for producers and artists.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans">{children}</body>
    </html>
  );
}
