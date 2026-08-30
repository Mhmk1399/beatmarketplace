"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { DashboardAvatar, getUserName } from "@/components/dashboard/DashboardAvatar";
import { useAuth } from "@/components/auth/AuthProvider";
import { ChevronDownIcon, LogOutIcon, SettingsIcon, UserIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { cn } from "@/lib/cn";
import type { DashboardUser } from "@/lib/dashboard/session";
import type { WorkspaceDefinition } from "@/lib/dashboard/workspaces";

export function DashboardUserMenu({ user, workspace }: { user: DashboardUser; workspace: WorkspaceDefinition }) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const { logout } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (!open) return;

    function dismiss(event: KeyboardEvent | MouseEvent) {
      if (event instanceof KeyboardEvent && event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      } else if (event instanceof MouseEvent && !rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", dismiss);
    document.addEventListener("mousedown", dismiss);
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("mousedown", dismiss);
    };
  }, [open]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      toast.success("Signed out", "Your session has been cleared.");
      router.replace("/");
      router.refresh();
    } catch {
      toast.error("Could not sign out", "Please try again.");
      setLoggingOut(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open user menu"
        onClick={() => setOpen((current) => !current)}
        className="dashboard-user-button neo-raised flex min-h-12 max-w-[15rem] items-center gap-2.5 rounded-2xl px-2.5 text-left"
      >
        <DashboardAvatar user={user} className="size-8" />
        <span className="hidden min-w-0 flex-1 sm:block">
          <span className="block truncate text-xs font-bold text-[#e8e5ed]">{getUserName(user)}</span>
          <span className="block truncate text-[10px] text-[#777d89]">{workspace.shortLabel}</span>
        </span>
        <ChevronDownIcon className={cn("hidden size-4 shrink-0 text-[#7f8592] transition-transform sm:block", open && "rotate-180")} />
      </button>

      {open && (
        <div role="menu" className="neo-raised-strong absolute right-0 top-[calc(100%+.7rem)] z-50 w-[18rem] max-w-[calc(100vw-2rem)] rounded-[22px] p-2">
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-extrabold text-[#efedf2]">{getUserName(user)}</p>
            <p className="mt-1 truncate text-xs text-[#7e8490]">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-white/[0.045]" />
          <Link role="menuitem" href="/dashboard/profile" onClick={() => setOpen(false)} className="dashboard-menu-item">
            <UserIcon className="size-[18px]" /> Profile
          </Link>
          <Link role="menuitem" href={`${workspace.href}/settings`} onClick={() => setOpen(false)} className="dashboard-menu-item">
            <SettingsIcon className="size-[18px]" /> Settings
          </Link>
          <button role="menuitem" type="button" onClick={handleLogout} disabled={loggingOut} className="dashboard-menu-item w-full text-[#f0a2b5]">
            <LogOutIcon className="size-[18px]" /> {loggingOut ? "Logging out…" : "Logout"}
          </button>
        </div>
      )}
    </div>
  );
}
