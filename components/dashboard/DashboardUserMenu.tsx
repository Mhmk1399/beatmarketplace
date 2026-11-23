"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { DashboardAvatar, getUserName } from "@/components/dashboard/DashboardAvatar";
import { useAuth } from "@/components/auth/AuthProvider";
import { ChevronDownIcon, LogOutIcon, SettingsIcon, UserIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { DashboardUser } from "@/lib/dashboard/session";
import type { WorkspaceDefinition } from "@/lib/dashboard/workspaces";

export function DashboardUserMenu({ user, workspace }: { user: DashboardUser; workspace: WorkspaceDefinition }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { requestLogout, isLoggingOut } = useAuth();

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

  function handleLogout() {
    setOpen(false);
    buttonRef.current?.focus();
    requestLogout();
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
        className="dashboard-user-button neo-raised flex min-h-12 max-w-[15rem] items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 text-left"
      >
        <DashboardAvatar user={user} className="size-8" />
        <span className="hidden min-w-0 flex-1 sm:block">
          <span className="block truncate text-xs font-bold text-foreground">{getUserName(user)}</span>
          <span className="block truncate text-[10px] text-faint">{workspace.shortLabel}</span>
        </span>
        <ChevronDownIcon className={cn("hidden size-4 shrink-0 text-faint transition-transform sm:block", open && "rotate-180")} />
      </button>

      {open && (
        <div role="menu" className="neo-raised-strong absolute right-0 top-[calc(100%+.7rem)] z-50 w-[18rem] max-w-[calc(100vw-2rem)] rounded-[22px] p-2">
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-extrabold text-foreground">{getUserName(user)}</p>
            <p className="mt-1 truncate text-xs text-faint">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-divider" />
          <Link role="menuitem" href={`${workspace.href}/profile`} onClick={() => setOpen(false)} className="dashboard-menu-item">
            <UserIcon className="size-[18px]" /> Profile
          </Link>
          <Link role="menuitem" href={`${workspace.href}/settings`} onClick={() => setOpen(false)} className="dashboard-menu-item">
            <SettingsIcon className="size-[18px]" /> Settings
          </Link>
          <button role="menuitem" type="button" onClick={handleLogout} disabled={isLoggingOut} className="dashboard-menu-item w-full text-error-text">
            <LogOutIcon className="size-[18px]" /> {isLoggingOut ? "Signing out…" : "Logout"}
          </button>
        </div>
      )}
    </div>
  );
}
