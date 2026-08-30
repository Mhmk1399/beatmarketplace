import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export function NeumorphicIconButton({ className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={cn("neo-icon-button inline-flex size-12 items-center justify-center rounded-full", className)} {...props} />;
}
