"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { ArrowRightIcon } from "@/components/ui/icons";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";

export function AboutCommunityCta() {
  const { user, status } = useAuth();
  return <NeumorphicLink href={status === "authenticated" && user ? "/dashboard" : "/signup"} variant="accent">Join Our Community <ArrowRightIcon /></NeumorphicLink>;
}
