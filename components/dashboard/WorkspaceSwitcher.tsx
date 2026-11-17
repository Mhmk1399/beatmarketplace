"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CheckIcon, ChevronDownIcon, GridIcon, ShieldIcon, StoreIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { WorkspaceDefinition } from "@/lib/dashboard/workspaces";

function WorkspaceIcon({ id, className }: { id: WorkspaceDefinition["id"]; className?: string }) {
  const Icon = id === "admin" ? ShieldIcon : id === "producer" ? StoreIcon : GridIcon;
  return <Icon className={className} />;
}

export function WorkspaceSwitcher({ activeWorkspace, workspaces, onNavigate }: { activeWorkspace: WorkspaceDefinition; workspaces: readonly WorkspaceDefinition[]; onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const firstItem = rootRef.current?.querySelector<HTMLButtonElement>("[role='menuitem']");
    firstItem?.focus({ preventScroll: true });

    function dismiss(event: KeyboardEvent | MouseEvent) {
      if (event instanceof KeyboardEvent && event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus({ preventScroll: true });
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

  function selectWorkspace(workspace: WorkspaceDefinition) {
    setOpen(false);
    onNavigate?.();
    router.push(workspace.href);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="dashboard-workspace-button neo-raised-strong flex min-h-16 w-full items-center gap-3 rounded-[20px] px-3 text-left"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="neo-inset flex size-10 shrink-0 items-center justify-center rounded-[14px] text-accent-muted">
          <WorkspaceIcon id={activeWorkspace.id} className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-faint">Workspace</span>
          <span className="mt-0.5 block truncate text-sm font-extrabold text-foreground">{activeWorkspace.label}</span>
        </span>
        <ChevronDownIcon className={cn("size-4 shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div role="menu" aria-label="Choose workspace" className="neo-raised-strong absolute inset-x-0 top-[calc(100%+.65rem)] z-50 rounded-[20px] p-2">
          {workspaces.map((workspace) => {
            const active = workspace.id === activeWorkspace.id;
            return (
              <button
                type="button"
                role="menuitem"
                key={workspace.id}
                onClick={() => selectWorkspace(workspace)}
                className={cn("flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-control)] px-3 text-left text-sm text-muted hover:bg-[var(--hover-overlay)] hover:text-on-accent", active && "neo-inset text-accent-text")}
              >
                <WorkspaceIcon id={workspace.id} className="size-[18px] shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{workspace.label}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-faint">{workspace.description}</span>
                </span>
                {active && <CheckIcon className="size-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
