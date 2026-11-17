"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { CloseIcon } from "@/components/ui/icons";
import type { NavigationSection } from "@/lib/dashboard/navigation";
import type { DashboardUser } from "@/lib/dashboard/session";
import type { WorkspaceDefinition } from "@/lib/dashboard/workspaces";

export function DashboardMobileNav({
  activeWorkspace,
  id,
  navigation,
  onClose,
  open,
  user,
  workspaces,
}: {
  activeWorkspace: WorkspaceDefinition;
  id: string;
  navigation: readonly NavigationSection[];
  onClose: () => void;
  open: boolean;
  user: DashboardUser;
  workspaces: readonly WorkspaceDefinition[];
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const openingPath = useRef(pathname);

  useEffect(() => {
    if (!open) openingPath.current = pathname;
    else if (openingPath.current !== pathname) onClose();
  }, [onClose, open, pathname]);

  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    if (desktop.matches) { onClose(); return; }
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });

    function handleViewportChange(event: MediaQueryListEvent) {
      if (event.matches) onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        // A workspace popover handles its own first Escape before the drawer.
        if (event.defaultPrevented || dialogRef.current?.querySelector("[role='menu']")) return;
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])"))
        .filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0 && element.getAttribute("aria-disabled") !== "true");
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) {
        event.preventDefault();
        dialogRef.current.focus({ preventScroll: true });
      } else if (!dialogRef.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    desktop.addEventListener("change", handleViewportChange);
    window.addEventListener("hashchange", onClose);
    window.addEventListener("popstate", onClose);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      desktop.removeEventListener("change", handleViewportChange);
      window.removeEventListener("hashchange", onClose);
      window.removeEventListener("popstate", onClose);
      if (previouslyFocused?.isConnected && previouslyFocused.getClientRects().length > 0) previouslyFocused.focus({ preventScroll: true });
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] lg:hidden" role="presentation">
      <button type="button" tabIndex={-1} aria-hidden="true" className="absolute inset-0 bg-ink/70 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={dialogRef} id={id} role="dialog" aria-modal="true" aria-label="Dashboard navigation" tabIndex={-1} className="dashboard-mobile-drawer neo-raised-strong absolute inset-y-0 left-0 h-dvh w-[min(21rem,88vw)] overflow-hidden rounded-r-[28px]">
        <button ref={closeRef} type="button" onClick={onClose} className="neo-icon-button absolute right-3 top-3 z-10 inline-flex size-11 items-center justify-center rounded-xl" aria-label="Close dashboard navigation">
          <CloseIcon className="size-5" />
        </button>
        <DashboardSidebar activeWorkspace={activeWorkspace} navigation={navigation} onNavigate={onClose} user={user} workspaces={workspaces} />
      </div>
    </div>,
    document.body,
  );
}
