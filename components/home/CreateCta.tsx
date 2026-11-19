"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "@/components/ui/icons";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";

export function CreateCta({ className, label = "Start creating", variant = "accent", leadingIcon }: { className?: string; label?: string; variant?: "default" | "accent" | "quiet"; leadingIcon?: ReactNode }) {
  const { status, user } = useAuth();
  const href = status === "authenticated" && user ? user.roles.includes("PRODUCER") ? "/studio/tracks" : "/dashboard" : "/signup";

  return (
    <NeumorphicLink href={href} variant={variant} size="lg" className={className}>
      {leadingIcon}
      {label}
      <ArrowRightIcon className="size-4" />
    </NeumorphicLink>
  );
}
