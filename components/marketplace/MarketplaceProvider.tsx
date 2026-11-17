"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAudioActions, useAudioTransport } from "@/components/audio/AudioPlayerProvider";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { marketplaceAudioTrack } from "@/lib/audio/marketplace-track";
import type { AudioTrack } from "@/lib/audio/types";
import type { MarketplaceLicense, MarketplaceTrack } from "@/lib/marketplace/types";

export type CartItem = { track: MarketplaceTrack; license: MarketplaceLicense };
type Context = { track: AudioTrack | null; playing: boolean; toggle: (track: MarketplaceTrack, queue?: MarketplaceTrack[]) => void; cart: CartItem[]; add: (track: MarketplaceTrack, license: MarketplaceLicense) => void; remove: (id: string) => void; clear: () => void; favoriteIds: Set<string>; favorite: (id: string) => Promise<void> };
const MarketplaceContext = createContext<Context | null>(null);
const storageKey = "beatmarketplace-cart-v1";
export function formatPrice(value: number | string, currency = "IRT") { return currency === "IRT" ? `${new Intl.NumberFormat("en-US").format(Number(value))} toman` : `${value} ${currency}`; }
export function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`; }

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const toast = useToast();
  const { track, playing } = useAudioTransport();
  const { toggle: toggleAudio } = useAudioActions();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const cartReady = useRef(false);

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const parsed: unknown = JSON.parse(localStorage.getItem(storageKey) || "[]");
        if (Array.isArray(parsed)) setCart(parsed.filter((item): item is CartItem => item && typeof item.track?.id === "string" && typeof item.license?.id === "string" && typeof item.track?.title === "string" && Number.isFinite(Number(item.license?.price))).slice(0, 20));
      } catch { /* An unavailable browser store does not prevent shopping. */ }
      cartReady.current = true;
    });
  }, []);
  useEffect(() => { if (cartReady.current) { try { localStorage.setItem(storageKey, JSON.stringify(cart)); } catch { /* Session cart still works. */ } } }, [cart]);
  useEffect(() => {
    const controller = new AbortController();
    if (user) fetch("/api/favorites", { signal: controller.signal }).then((response) => response.ok ? response.json() : { tracks: [] }).then((data: { tracks: MarketplaceTrack[] }) => setFavoriteIds(new Set(data.tracks.map((item) => item.id)))).catch(() => undefined);
    else Promise.resolve().then(() => setFavoriteIds(new Set()));
    return () => controller.abort();
  }, [user]);

  const toggle = useCallback((next: MarketplaceTrack, queue?: MarketplaceTrack[]) => {
    if (!next.previewUrl) return;
    toggleAudio(marketplaceAudioTrack(next), queue?.filter((item) => item.previewUrl).map(marketplaceAudioTrack));
  }, [toggleAudio]);
  const add = useCallback((next: MarketplaceTrack, license: MarketplaceLicense) => {
    setCart((items) => [...items.filter((item) => item.track.id !== next.id), { track: next, license }].slice(0, 20));
    toast.success("Added to cart", `${next.title} · ${license.title}`);
  }, [toast]);
  const favorite = useCallback(async (id: string) => {
    if (!user) { toast.info("Sign in to save beats", "Your saved beats will be available across devices."); return; }
    const saved = favoriteIds.has(id);
    const response = await fetch(`/api/favorites/${id}`, { method: saved ? "DELETE" : "PUT" });
    if (!response.ok) { toast.error("Could not update saved beats", "Please try again."); return; }
    setFavoriteIds((ids) => { const next = new Set(ids); if (saved) next.delete(id); else next.add(id); return next; });
  }, [favoriteIds, toast, user]);
  const value = useMemo(() => ({ track, playing, toggle, cart, add, remove: (id: string) => setCart((items) => items.filter((item) => item.track.id !== id)), clear: () => setCart([]), favoriteIds, favorite }), [track, playing, toggle, cart, add, favoriteIds, favorite]);

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}
export function useMarketplace() { const value = useContext(MarketplaceContext); if (!value) throw new Error("MarketplaceProvider is required."); return value; }
