"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { BrandMark } from "@/components/public/BrandMark";
import { NeumorphicButton, NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function PublicNavbar() {
  const { logout, status, user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success("Signed out", "Your session has been cleared.");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Could not sign out", "Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-5">
      <nav aria-label="Primary navigation" className="neo-raised mx-auto flex min-h-16 max-w-7xl items-center gap-3 rounded-[22px] px-3 sm:px-5">
        <BrandMark className="shrink-0" />

        <div className="ml-4 hidden items-center gap-1 md:flex">
          <Link href="/#sounds" className="rounded-xl px-3 py-2 text-sm font-medium text-[#969ba7] transition-colors hover:text-[#f2f0f7] focus-visible:text-white">
            Sound preview
          </Link>
          <Link href="/#producer" className="rounded-xl px-3 py-2 text-sm font-medium text-[#969ba7] transition-colors hover:text-[#f2f0f7] focus-visible:text-white">
            For producers
          </Link>
          <Link href="/#how-it-works" className="rounded-xl px-3 py-2 text-sm font-medium text-[#969ba7] transition-colors hover:text-[#f2f0f7] focus-visible:text-white">
            How it works
          </Link>
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
          {status === "loading" ? (
            <div className="neo-inset h-10 w-32 animate-pulse rounded-2xl" aria-label="Loading session" />
          ) : user ? (
            <>
              <div className="hidden min-w-0 items-center gap-2 sm:flex">
                <span className="neo-inset flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-[#d8b4fe]" aria-hidden="true">
                  {getInitials(user.firstName, user.lastName)}
                </span>
                <div className="hidden min-w-0 lg:block">
                  <p className="truncate text-sm font-bold text-[#e9e7ed]">{user.profile?.displayName || user.firstName}</p>
                  <p className="text-[11px] uppercase tracking-[0.13em] text-[#777c88]">
                    {user.roles.includes("PRODUCER") ? "Producer" : "Member"}
                  </p>
                </div>
              </div>
              <NeumorphicLink href="/dashboard" size="sm" className="px-3">
                <span className="sm:hidden">App</span>
                <span className="hidden sm:inline">Dashboard</span>
              </NeumorphicLink>
              <NeumorphicButton size="sm" variant="quiet" onClick={handleLogout} disabled={isLoggingOut}>
                {isLoggingOut ? "Leaving…" : "Logout"}
              </NeumorphicButton>
            </>
          ) : (
            <>
              <NeumorphicLink href="/login" variant="quiet" size="sm" className="px-3 sm:px-4">
                Login
              </NeumorphicLink>
              <NeumorphicLink href="/signup" variant="accent" size="sm" className="px-3 sm:px-4">
                <span className="sm:hidden">Join</span>
                <span className="hidden sm:inline">Create account</span>
              </NeumorphicLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
