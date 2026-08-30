import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

type SurfaceProps = ComponentPropsWithoutRef<"div"> & {
  depth?: "soft" | "strong" | "inset";
};

export function NeumorphicSurface({ className, depth = "soft", ...props }: SurfaceProps) {
  return <div className={cn(depth === "strong" ? "neo-raised-strong" : depth === "inset" ? "neo-inset" : "neo-raised", className)} {...props} />;
}
