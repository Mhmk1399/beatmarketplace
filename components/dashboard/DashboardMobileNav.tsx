"use client";

import { useEffect, useRef } from "react";

import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { CloseIcon } from "@/components/ui/icons";
import type { NavigationSection } from "@/lib/dashboard/navigation";
import type { DashboardUser } from "@/lib/dashboard/session";
import type { WorkspaceDefinition } from "@/lib/dashboard/workspaces";

export function DashboardMobileNav({
  activeWorkspace,
  navigation,
  onClose,
  open,
  user,
  workspaces,
}: {
  activeWorkspace: WorkspaceDefinition;
  navigation: readonly NavigationSection[];
  onClose: () => void;
  open: boolean;
  user: DashboardUser;
  workspaces: readonly WorkspaceDefinition[];
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
      <button type="button" aria-label="Close dashboard navigation" className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Dashboard navigation" className="dashboard-mobile-drawer neo-raised-strong absolute inset-y-0 left-0 w-[min(21rem,88vw)] overflow-hidden rounded-r-[28px]">
        <button ref={closeRef} type="button" onClick={onClose} className="neo-icon-button absolute right-3 top-3 z-10 inline-flex size-10 items-center justify-center rounded-xl" aria-label="Close dashboard navigation">
          <CloseIcon className="size-5" />
        </button>
        <DashboardSidebar activeWorkspace={activeWorkspace} navigation={navigation} onNavigate={onClose} user={user} workspaces={workspaces} />
      </div>
    </div>
  );
}
