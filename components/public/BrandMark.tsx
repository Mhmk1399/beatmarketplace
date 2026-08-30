import Link, { type LinkProps } from "next/link";

import { MusicNoteIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function BrandMark({ className, compact = false, href = "/" }: { className?: string; compact?: boolean; href?: LinkProps["href"] }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-3 rounded-xl", className)} aria-label="BeatMarketplace home">
      <span className="neo-raised flex size-10 items-center justify-center rounded-[15px] text-[#c084fc] transition-transform duration-200 group-hover:-translate-y-0.5">
        <MusicNoteIcon className="size-5" />
      </span>
      {!compact && (
        <span className="text-[15px] font-extrabold tracking-[-0.02em] text-[#f2f0f7]">
          Beat<span className="text-[#b47af8]">Marketplace</span>
        </span>
      )}
    </Link>
  );
}
