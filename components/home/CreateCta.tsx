"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { ArrowRightIcon } from "@/components/ui/icons";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";

export function CreateCta({ className, label = "Start creating" }: { className?: string; label?: string }) {
  const { status, user } = useAuth();
  const href = status === "authenticated" && user ? user.roles.includes("PRODUCER") ? "/studio/tracks" : "/dashboard" : "/signup";

  return (
    <NeumorphicLink href={href} variant="accent" size="lg" className={className}>
      {label}
      <ArrowRightIcon className="size-4" />
    </NeumorphicLink>
  );
}
