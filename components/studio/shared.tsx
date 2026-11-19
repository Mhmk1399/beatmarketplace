"use client";

import { useId, type ReactNode } from "react";

import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { startGlobalLoading } from "@/components/ui/dynamic/GlobalLoading";
import { notifyTableMutation } from "@/lib/workspace/table-cache";
import { uploadRequest, type UploadTransferProgress } from "@/lib/uploads/transport";

export const controlClass = "neo-input-wrap min-h-12 w-full rounded-[var(--radius-control)] px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--faint)] disabled:opacity-50";

export function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return <div className="min-w-0 space-y-2"><label htmlFor={id} className="block text-sm font-semibold text-[var(--text-secondary)]">{label}</label>{children(id)}{hint && <p className="text-xs leading-5 text-[var(--muted)]">{hint}</p>}</div>;
}

export function RequestError({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="neo-inset space-y-3 rounded-[var(--radius-control)] p-4" role="alert"><p className="text-sm leading-6 text-[var(--error-text)]">{message}</p>{retry && <NeumorphicButton size="sm" onClick={retry}>Try again</NeumorphicButton>}</div>;
}

export class ApiRequestError extends Error { constructor(message: string, public status: number, public issues: { field: string; message: string }[] = []) { super(message); } }
export async function apiRequest<T>(url: string, init?: RequestInit & { quiet?: boolean; onUploadProgress?: (progress: UploadTransferProgress) => void }): Promise<T> {
  const { quiet, onUploadProgress, ...requestInit } = init ?? {};
  const done = !quiet && typeof window !== "undefined" && /^\/(admin|studio|dashboard)(\/|$)/.test(location.pathname) ? startGlobalLoading(init?.method && init.method !== "GET" ? (init.body instanceof FormData ? "Uploading your files…" : "Saving changes…") : "Loading your workspace…") : () => {};
  const controller = new AbortController(), abort = () => controller.abort();
  init?.signal?.addEventListener("abort", abort, { once: true }); if (init?.signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, init?.body instanceof FormData ? 150_000 : 25_000);
  try {
  if (requestInit.body instanceof FormData && Array.from(requestInit.body.values()).some(value => value instanceof File && (/^image\//i.test(value.type) || /\.(png|jpe?g|webp)$/i.test(value.name)))) {
    onUploadProgress?.({ phase: "preparing", loaded: 0, total: null, percent: null });
    const { prepareImageFormData } = await import("@/lib/uploads/optimize-image");
    requestInit.body = await prepareImageFormData(requestInit.body, controller.signal);
  }
  const response = requestInit.body instanceof FormData && onUploadProgress
    ? await uploadRequest(url, requestInit, controller.signal, onUploadProgress)
    : await fetch(url, { cache: "no-store", ...requestInit, signal: controller.signal });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const details = data?.issues?.map((issue: { field?: string; message: string }) => `${issue.field ? `${issue.field}: ` : ""}${issue.message}`).join(" ");
    throw new ApiRequestError(details || data?.error || `Request failed (${response.status}). Please try again.`, response.status, data?.issues ?? []);
  }
  if (data === null) throw new ApiRequestError("The server returned an incomplete response. Please try again.", 503);
  if (requestInit.method && !["GET", "HEAD", "OPTIONS"].includes(requestInit.method.toUpperCase())) await notifyTableMutation(url, requestInit.body);
  return data as T;
  } catch (error) { if (init?.signal?.aborted || error instanceof ApiRequestError) throw error; if (error instanceof Error && error.name === "ImageOptimizationError") throw new ApiRequestError(error.message, 400); throw new ApiRequestError(controller.signal.aborted ? "The request took too long. Please try again." : "Connection lost. Please try again.", 503); }
  finally { clearTimeout(timeout); init?.signal?.removeEventListener("abort", abort); done(); }
}

export function formatTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The request could not be completed. Please try again.";
}
