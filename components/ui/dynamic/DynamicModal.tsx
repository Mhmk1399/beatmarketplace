"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { CloseIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type DynamicModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnBackdrop?: boolean;
};

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export function DynamicModal({ children, closeOnBackdrop = true, description, footer, onClose, open, size = "md", title }: DynamicModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = panelRef.current?.querySelector<HTMLElement>("[data-autofocus], button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])");
    focusable?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
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
      previousFocus?.focus();
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-5" role="presentation">
      <button type="button" tabIndex={-1} aria-hidden="true" className="absolute inset-0 bg-black/72 backdrop-blur-[3px]" onClick={closeOnBackdrop ? onClose : undefined} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn("neo-raised-strong relative z-10 flex max-h-[min(90dvh,54rem)] w-full flex-col overflow-hidden rounded-t-[30px] sm:rounded-[30px]", sizeClasses[size])}
      >
        <header className="flex items-start gap-4 border-b border-white/[0.045] px-5 py-5 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-xl font-black tracking-[-0.03em] text-[#efecf2]">{title}</h2>
            {description && <p id={descriptionId} className="mt-2 text-sm leading-6 text-[#858b97]">{description}</p>}
          </div>
          <button data-autofocus type="button" onClick={onClose} aria-label="Close modal" className="neo-icon-button inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
            <CloseIcon className="size-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">{children}</div>
        {footer && <footer className="flex flex-col-reverse gap-3 border-t border-white/[0.045] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
