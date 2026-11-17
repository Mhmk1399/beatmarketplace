"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { CheckIcon, CloseIcon, ShieldIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type ToastVariant = "success" | "error" | "warning" | "info";

export type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastRecord = Required<Pick<ToastInput, "title" | "variant" | "duration">> & Pick<ToastInput, "description"> & { id: string };

type ToastApi = {
  show: (toast: ToastInput) => string;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
};

const ToastContext = createContext<ToastApi | null>(null);
let toastSequence = 0;

function nextToastId() {
  toastSequence += 1;
  return `toast-${Date.now()}-${toastSequence}`;
}

const variantStyles: Record<ToastVariant, { accent: string; icon: string }> = {
  success: { accent: "bg-success", icon: "text-success-text" },
  error: { accent: "bg-error", icon: "text-error-text" },
  warning: { accent: "bg-warning", icon: "text-warning-text" },
  info: { accent: "bg-info", icon: "text-info-text" },
};

function ToastItem({ dismiss, toast }: { dismiss: (id: string) => void; toast: ToastRecord }) {
  const style = variantStyles[toast.variant];

  return (
    <div
      role={toast.variant === "error" ? "alert" : "status"}
      className="neo-raised-strong relative grid w-full grid-cols-[auto_1fr_auto] gap-3 overflow-hidden rounded-[20px] p-4"
      style={{ animation: "toast-enter var(--motion-base) ease-out" }}
      onMouseEnter={(event) => event.currentTarget.style.setProperty("--toast-paused", "paused")}
      onMouseLeave={(event) => event.currentTarget.style.removeProperty("--toast-paused")}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", style.accent)} aria-hidden="true" />
      <span className={cn("neo-inset flex size-9 items-center justify-center rounded-xl", style.icon)} aria-hidden="true">
        {toast.variant === "success" ? <CheckIcon className="size-5" /> : <ShieldIcon className="size-5" />}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-extrabold text-foreground">{toast.title}</p>
        {toast.description && <p className="mt-1 text-xs leading-5 text-muted">{toast.description}</p>}
      </div>
      <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification" className="flex size-8 items-center justify-center rounded-lg text-faint hover:bg-[var(--hover-overlay)] hover:text-on-accent">
        <CloseIcon className="size-4" />
      </button>
      {toast.duration > 0 && <span className={cn("toast-progress absolute inset-x-0 bottom-0 h-0.5 origin-left", style.accent)} style={{ animationDuration: `${toast.duration}ms` }} onAnimationEnd={() => dismiss(toast.id)} aria-hidden="true" />}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismiss = useCallback((id: string) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);
  const dismissAll = useCallback(() => setToasts([]), []);
  const show = useCallback((input: ToastInput) => {
    const id = nextToastId();
    const toast: ToastRecord = { id, title: input.title, description: input.description, variant: input.variant ?? "info", duration: input.duration ?? 5000 };
    setToasts((current) => [...current.slice(-3), toast]);
    return id;
  }, []);

  const api = useMemo<ToastApi>(() => ({
    show,
    success: (title, description) => show({ title, description, variant: "success" }),
    error: (title, description) => show({ title, description, variant: "error", duration: 6500 }),
    warning: (title, description) => show({ title, description, variant: "warning" }),
    info: (title, description) => show({ title, description, variant: "info" }),
    dismiss,
    dismissAll,
  }), [dismiss, dismissAll, show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-label="Notifications" aria-live="polite" className="pointer-events-none fixed inset-x-3 bottom-3 z-[120] flex flex-col items-end gap-3 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[24rem]">
        {toasts.map((toast) => <div key={toast.id} className="pointer-events-auto w-full"><ToastItem toast={toast} dismiss={dismiss} /></div>)}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider.");
  return context;
}
