"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

type NeumorphicInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  trailing?: ReactNode;
};

export const NeumorphicInput = forwardRef<HTMLInputElement, NeumorphicInputProps>(function NeumorphicInput(
  { className, error, hint, id, label, trailing, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-semibold text-secondary">
        {label}
      </label>
      <div className={cn("neo-input-wrap relative rounded-[var(--radius-control)]", error && "neo-input-error")}>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={descriptionId}
          className={cn(
            "neo-input min-h-[var(--control-height)] w-full rounded-[var(--radius-control)] bg-transparent px-4 text-[15px] text-foreground outline-none placeholder:text-faint",
            Boolean(trailing) && "pr-13",
            className,
          )}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-2 flex items-center">{trailing}</div>}
      </div>
      {error ? (
        <p id={descriptionId} className="text-sm text-error-text" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={descriptionId} className="text-xs leading-5 text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
