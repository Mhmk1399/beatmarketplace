import Link, { type LinkProps } from "next/link";
import type { ComponentPropsWithRef, MouseEventHandler, ReactNode } from "react";

import { cn } from "@/lib/cn";

type Variant = "default" | "accent" | "quiet";
type Size = "sm" | "md" | "lg";

export function neumorphicButtonClass(variant: Variant = "default", size: Size = "md") {
  return cn(
    "neo-button inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold",
    variant === "accent" && "neo-button-accent",
    variant === "quiet" && "neo-button-quiet",
    size === "sm" && "min-h-11 px-4 text-sm",
    size === "md" && "min-h-11 px-5 text-sm",
    size === "lg" && "min-h-13 px-6 text-base",
  );
}

type NeoButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: Variant;
  size?: Size;
};

export function NeumorphicButton({ className, variant, size, type = "button", ...props }: NeoButtonProps) {
  return <button type={type} className={cn(neumorphicButtonClass(variant, size), className)} {...props} />;
}

type NeoLinkProps = LinkProps & {
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  children: ReactNode;
  className?: string;
  variant?: Variant;
  size?: Size;
  "aria-label"?: string;
};

export function NeumorphicLink({ className, variant, size, ...props }: NeoLinkProps) {
  return <Link className={cn(neumorphicButtonClass(variant, size), className)} {...props} />;
}
