"use client";

import { useId, type ReactNode } from "react";

import { NeumorphicButton } from "@/components/ui/neumorphic/Button";

export const controlClass = "neo-input-wrap min-h-12 w-full rounded-[var(--radius-control)] px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--faint)] disabled:opacity-50";

export function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return <div className="space-y-2"><label htmlFor={id} className="block text-sm font-semibold text-[var(--text-secondary)]">{label}</label>{children(id)}{hint && <p className="text-xs leading-5 text-[var(--muted)]">{hint}</p>}</div>;
}

export function RequestError({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="neo-inset space-y-3 rounded-[var(--radius-control)] p-4" role="alert"><p className="text-sm leading-6 text-[var(--error-text)]">{message}</p>{retry && <NeumorphicButton size="sm" onClick={retry}>Try again</NeumorphicButton>}</div>;
}

export async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const details = data?.issues?.map((issue: { field?: string; message: string }) => `${issue.field ? `${issue.field}: ` : ""}${issue.message}`).join(" ");
    throw new Error(details || data?.error || `Request failed (${response.status}). Please try again.`);
  }
  return data as T;
}

export function formatTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The request could not be completed. Please try again.";
}
