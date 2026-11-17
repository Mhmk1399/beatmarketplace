"use client";

import { useState } from "react";
import { useMarketplace } from "@/components/marketplace/MarketplaceProvider";
import { HeartIcon } from "@/components/ui/icons";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { cn } from "@/lib/cn";
import { toggleDemoFavorite, useDemoFavorite } from "@/lib/audio/demo-favorites";
import type { AudioTrack } from "@/lib/audio/types";

export function AudioFavoriteButton({ track, className }: { track: AudioTrack; className?: string }) {
  const marketplace = useMarketplace();
  const demoSaved = useDemoFavorite(track.id);
  const saved = track.isDemo ? demoSaved : marketplace.favoriteIds.has(track.id);
  const [pending, setPending] = useState(false);
  const toast = useToast();
  async function toggle() {
    if (track.isDemo) {
      if (!toggleDemoFavorite(track.id).persistent) toast.info("Saved for this visit", "Browser storage is unavailable. Your favorites remain available in this tab.");
      return;
    }
    setPending(true);
    try { await marketplace.favorite(track.id); }
    catch { toast.error("Could not update favorites", "Please try again."); }
    finally { setPending(false); }
  }
  return <NeumorphicButton className={cn("audio-favorite-button", className)} aria-label={`${saved ? "Remove" : "Add"} ${track.title} ${saved ? "from" : "to"} favorites`} title={saved ? "Remove from favorites" : "Add to favorites"} aria-pressed={saved} aria-busy={pending} data-saved={saved} disabled={pending} onClick={() => void toggle()}><HeartIcon filled={saved} className="size-4" /></NeumorphicButton>;
}
