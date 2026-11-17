"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { CloseIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useSheetGesture } from "./useSheetGesture";
import styles from "./DynamicModal.module.css";

type DynamicModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnBackdrop?: boolean;
  presentation?: "dialog" | "sheet";
};

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export function DynamicModal({ children, closeOnBackdrop = true, description, footer, onClose, open, presentation = "dialog", size = "md", title }: DynamicModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const sheet = presentation === "sheet";
  const { requestClose, dragHandlers } = useSheetGesture({ enabled: sheet, open, panelRef, backdropRef, onClose });

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = panelRef.current?.querySelector<HTMLElement>("[data-autofocus], button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])");
    focusable?.focus({ preventScroll: true });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const controls = Array.from(panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"));
      const first = controls[0];
      const last = controls.at(-1);
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
      previousFocus?.focus({ preventScroll: true });
    };
  }, [requestClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={cn("fixed inset-0 z-[100] flex items-end justify-center p-0 sm:p-5", !sheet && "sm:items-center")} role="presentation">
      <button ref={backdropRef} type="button" tabIndex={-1} aria-hidden="true" className="absolute inset-0 bg-ink/72 backdrop-blur-[3px]" style={sheet ? { opacity: 0 } : undefined} onClick={closeOnBackdrop ? requestClose : undefined} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        style={sheet ? { transform: "translate3d(0, calc(100% + 32px), 0)" } : undefined}
        className={cn("neo-raised-strong relative z-10 flex max-h-[min(90dvh,54rem)] w-full flex-col overflow-hidden rounded-t-[var(--radius-panel)] sm:rounded-[var(--radius-panel)]", sizeClasses[size], sheet && styles.sheet)}
      >
        <div className={sheet ? styles.dragRegion : undefined} {...dragHandlers}>
        {sheet && <button type="button" data-sheet-handle className={styles.handle} onClick={requestClose} aria-label="Close player panel" title="Drag down or tap to close"><span aria-hidden="true" /></button>}
        <header className={cn("flex items-start gap-4 border-b border-divider px-5 py-5 sm:px-6", sheet && styles.header)}>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-xl font-black tracking-[-0.03em] text-foreground">{title}</h2>
            {description && <p id={descriptionId} className="mt-2 text-sm leading-6 text-muted">{description}</p>}
          </div>
          <button data-autofocus type="button" onClick={requestClose} aria-label="Close modal" className="neo-icon-button inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
            <CloseIcon className="size-5" />
          </button>
        </header>
        </div>
        <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6", sheet && styles.body)}>{children}</div>
        {footer && <footer className="flex flex-col-reverse gap-3 border-t border-divider px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
