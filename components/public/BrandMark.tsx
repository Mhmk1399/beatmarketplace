import Link, { type LinkProps } from "next/link";
import type { MouseEventHandler } from "react";

import { MusicNoteIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function BrandMark({ className, compact = false, href = "/", onClick }: { className?: string; compact?: boolean; href?: LinkProps["href"]; onClick?: MouseEventHandler<HTMLAnchorElement> }) {
  return (
    <Link href={href} onClick={onClick} className={cn("group inline-flex items-center gap-3 rounded-xl", className)} aria-label="BeatMarketplace home">
      <span className="neo-raised flex size-10 items-center justify-center rounded-[15px] text-[var(--focus)] transition-transform duration-200 group-hover:-translate-y-0.5">
        <MusicNoteIcon className="size-5" />
      </span>
      {!compact && (
        <span className="text-[15px] font-extrabold tracking-[-0.02em] text-foreground">
          Beat<span className="text-accent-muted">Marketplace</span>
        </span>
      )}
    </Link>
  );
}
