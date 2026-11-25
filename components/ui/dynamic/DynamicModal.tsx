"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";
import { CloseIcon } from "@/components/ui/icons";
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
  className?: string;
};

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export function DynamicModal({
  children,
  className,
  closeOnBackdrop = true,
  description,
  footer,
  onClose,
  open,
  presentation = "dialog",
  size = "md",
  title,
}: DynamicModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sheet = presentation === "sheet";
  const { requestClose, dragHandlers } = useSheetGesture({
    enabled: sheet,
    open,
    panelRef,
    backdropRef,
    onClose,
  });

  useEffect(() => {
    if (!open) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function controls() {
      return Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
        "button, a[href], input, select, textarea, [tabindex]",
      ) ?? []).filter(element =>
        !element.matches(":disabled") &&
        !element.closest("[inert], [hidden], [aria-hidden='true']") &&
        element.tabIndex >= 0 && element.getClientRects().length > 0,
      );
    }
    const initialControls = controls();
    const initialFocus = initialControls.find(element => element.hasAttribute("data-autofocus")) ??
      initialControls.find(element => element === closeButtonRef.current) ?? initialControls[0] ?? panelRef.current;
    initialFocus?.focus({ preventScroll: true });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      // A native picker in the top layer owns keyboard focus until it closes.
      const nativeDialog = event.target instanceof Element ? event.target.closest("dialog[open]") : null;
      if (nativeDialog && !panelRef.current?.contains(nativeDialog)) return;
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const available = controls();
      const first = available[0];
      const last = available.at(-1);
      if (!available.length || !panelRef.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
        if (!available.length) panelRef.current.focus();
      } else if (event.shiftKey && document.activeElement === first) {
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
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-end justify-center p-0 sm:p-5",
        !sheet && "sm:items-center",
      )}
      role="presentation"
    >
      <button
        ref={backdropRef}
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className="absolute inset-0 bg-ink/72 backdrop-blur-[3px]"
        style={sheet ? { opacity: 0 } : undefined}
        onClick={closeOnBackdrop ? requestClose : undefined}
      />
      <div
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        style={
          sheet
            ? { transform: "translate3d(0, calc(100% + 32px), 0)" }
            : undefined
        }
        className={cn(
          "neo-raised-strong relative z-10 flex max-h-[min(90dvh,54rem)] w-full flex-col overflow-hidden rounded-t-[var(--radius-panel)] sm:rounded-[var(--radius-panel)]",
          sizeClasses[size],
          sheet && styles.sheet,
          className,
        )}
      >
        <div
          className={sheet ? styles.dragRegion : undefined}
          {...dragHandlers}
        >
          {sheet && (
            <button
              type="button"
              data-sheet-handle
              className={styles.handle}
              onClick={requestClose}
              aria-label="Close player panel"
              title="Drag down or tap to close"
            >
              <span aria-hidden="true" />
            </button>
          )}
          <header
            className={cn(
              "flex items-start gap-4 border-b border-divider px-5 py-5 sm:px-6",
              sheet && styles.header,
            )}
          >
            <div className="min-w-0 flex-1">
              <h2
                id={titleId}
                className="text-xl font-black tracking-[-0.03em] text-foreground"
              >
                {title}
              </h2>
              {description && (
                <p
                  id={descriptionId}
                  className="mt-2 text-sm leading-6 text-muted"
                >
                  {description}
                </p>
              )}
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={requestClose}
              aria-label="Close modal"
              className="neo-icon-button mt-3 inline-flex size-10 shrink-0 items-center justify-center rounded-xl"
            >
              <CloseIcon className="size-5" />
            </button>
          </header>
        </div>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6",
            sheet && styles.body,
          )}
        >
          {children}
        </div>
        {footer && (
          <footer className="flex flex-col-reverse gap-3 border-t border-divider px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
