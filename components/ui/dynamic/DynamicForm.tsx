"use client";

import { useId, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";

import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { NeumorphicInput } from "@/components/ui/neumorphic/Input";
import { cn } from "@/lib/cn";

export type DynamicFormValue = string | boolean;
type FieldName<T> = Extract<keyof T, string>;

type SharedField<T> = {
  name: FieldName<T>;
  label: string;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  colSpan?: 1 | 2;
};

type TextField<T> = SharedField<T> & {
  type?: "text" | "email" | "password" | "tel" | "url" | "number" | "date";
  autoComplete?: string;
  autoFocus?: boolean;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  min?: string | number;
  max?: string | number;
  minLength?: number;
  maxLength?: number;
  revealable?: boolean;
};

type TextareaField<T> = SharedField<T> & {
  type: "textarea";
  rows?: number;
  minLength?: number;
  maxLength?: number;
};

type SelectField<T> = SharedField<T> & {
  type: "select";
  options: readonly { label: string; value: string; disabled?: boolean }[];
};

type CheckboxField<T> = Omit<SharedField<T>, "placeholder"> & {
  type: "checkbox";
};

export type DynamicFormField<T> = TextField<T> | TextareaField<T> | SelectField<T> | CheckboxField<T>;
export type DynamicFormErrors<T> = Partial<Record<FieldName<T>, string>>;

type DynamicFormProps<T extends { [K in keyof T]: DynamicFormValue }> = {
  fields: readonly DynamicFormField<T>[];
  values: T;
  onValueChange: <K extends FieldName<T>>(name: K, value: T[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  errors?: DynamicFormErrors<T>;
  formError?: string;
  submitLabel: string;
  submittingLabel?: string;
  isSubmitting?: boolean;
  disabled?: boolean;
  columns?: 1 | 2;
  fullWidthSubmit?: boolean;
  actions?: ReactNode;
  className?: string;
  id?: string;
};

function FieldMessage({ descriptionId, error, hint }: { descriptionId?: string; error?: string; hint?: string }) {
  if (error) return <p id={descriptionId} className="text-sm text-[#ff8fa9]" role="alert">{error}</p>;
  if (hint) return <p id={descriptionId} className="text-xs leading-5 text-[#8e93a0]">{hint}</p>;
  return null;
}

export function DynamicForm<T extends { [K in keyof T]: DynamicFormValue }>({
  actions,
  className,
  columns = 1,
  disabled = false,
  errors = {},
  fields,
  formError,
  fullWidthSubmit = false,
  id,
  isSubmitting = false,
  onSubmit,
  onValueChange,
  submitLabel,
  submittingLabel = "Saving…",
  values,
}: DynamicFormProps<T>) {
  const generatedId = useId();
  const formId = id ?? `dynamic-form-${generatedId}`;
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(() => new Set());

  function togglePassword(name: string) {
    setVisiblePasswords((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <form id={formId} className={cn("space-y-5", className)} onSubmit={onSubmit} noValidate>
      <fieldset disabled={isSubmitting || disabled} className={cn("grid gap-5", columns === 2 && "sm:grid-cols-2")}>
        <legend className="sr-only">Form fields</legend>
        {fields.map((field) => {
          const name = String(field.name);
          const inputId = `${formId}-${name}`;
          const error = errors[field.name];
          const descriptionId = error ? `${inputId}-error` : field.hint ? `${inputId}-hint` : undefined;
          const fieldClass = cn(columns === 2 && field.colSpan !== 1 && "sm:col-span-2");

          if (field.type === "checkbox") {
            return (
              <div key={name} className={fieldClass}>
                <label htmlFor={inputId} className="neo-inset flex min-h-13 cursor-pointer items-start gap-3 rounded-2xl px-4 py-3 text-sm text-[#d7d9e0]">
                  <input
                    id={inputId}
                    name={name}
                    type="checkbox"
                    checked={Boolean(values[field.name])}
                    required={field.required}
                    disabled={field.disabled}
                    aria-invalid={Boolean(error)}
                    aria-describedby={descriptionId}
                    onChange={(event) => onValueChange(field.name, event.currentTarget.checked as T[typeof field.name])}
                    className="mt-0.5 size-4 accent-[#9b5cf6]"
                  />
                  <span><span className="font-semibold">{field.label}</span>{field.hint && <span className="mt-1 block text-xs leading-5 text-[#858b97]">{field.hint}</span>}</span>
                </label>
                {error && <div className="mt-2"><FieldMessage descriptionId={descriptionId} error={error} /></div>}
              </div>
            );
          }

          if (field.type === "textarea") {
            return (
              <div key={name} className={cn("space-y-2", fieldClass)}>
                <label htmlFor={inputId} className="block text-sm font-semibold text-[#d7d9e0]">{field.label}</label>
                <div className={cn("neo-input-wrap rounded-2xl", error && "neo-input-error")}>
                  <textarea
                    id={inputId}
                    name={name}
                    value={String(values[field.name])}
                    rows={field.rows ?? 5}
                    required={field.required}
                    disabled={field.disabled}
                    minLength={field.minLength}
                    maxLength={field.maxLength}
                    placeholder={field.placeholder}
                    aria-invalid={Boolean(error)}
                    aria-describedby={descriptionId}
                    onChange={(event) => onValueChange(field.name, event.currentTarget.value as T[typeof field.name])}
                    className="min-h-28 w-full resize-y rounded-2xl bg-transparent px-4 py-3 text-[15px] leading-6 text-[#f2f0f7] outline-none placeholder:text-[#747985]"
                  />
                </div>
                <FieldMessage descriptionId={descriptionId} error={error} hint={field.hint} />
              </div>
            );
          }

          if (field.type === "select") {
            return (
              <div key={name} className={cn("space-y-2", fieldClass)}>
                <label htmlFor={inputId} className="block text-sm font-semibold text-[#d7d9e0]">{field.label}</label>
                <div className={cn("neo-input-wrap rounded-2xl", error && "neo-input-error")}>
                  <select
                    id={inputId}
                    name={name}
                    value={String(values[field.name])}
                    required={field.required}
                    disabled={field.disabled}
                    aria-invalid={Boolean(error)}
                    aria-describedby={descriptionId}
                    onChange={(event) => onValueChange(field.name, event.currentTarget.value as T[typeof field.name])}
                    className="min-h-12 w-full rounded-2xl bg-transparent px-4 text-[15px] text-[#f2f0f7] outline-none"
                  >
                    {field.placeholder && <option value="">{field.placeholder}</option>}
                    {field.options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
                  </select>
                </div>
                <FieldMessage descriptionId={descriptionId} error={error} hint={field.hint} />
              </div>
            );
          }

          const passwordVisible = field.type === "password" && visiblePasswords.has(name);
          return (
            <div key={name} className={fieldClass}>
              <NeumorphicInput
                id={inputId}
                label={field.label}
                name={name}
                type={passwordVisible ? "text" : field.type ?? "text"}
                value={String(values[field.name])}
                error={error}
                hint={field.hint}
                placeholder={field.placeholder}
                required={field.required}
                disabled={field.disabled}
                autoComplete={field.autoComplete}
                autoFocus={field.autoFocus}
                inputMode={field.inputMode}
                min={field.min}
                max={field.max}
                minLength={field.minLength}
                maxLength={field.maxLength}
                onChange={(event) => onValueChange(field.name, event.currentTarget.value as T[typeof field.name])}
                trailing={field.type === "password" && field.revealable ? (
                  <button type="button" className="flex size-9 items-center justify-center rounded-xl text-[#8d929e] transition-colors hover:text-[#d8b4fe]" onClick={() => togglePassword(name)} aria-label={passwordVisible ? `Hide ${field.label.toLowerCase()}` : `Show ${field.label.toLowerCase()}`}>
                    {passwordVisible ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
                  </button>
                ) : undefined}
              />
            </div>
          );
        })}
      </fieldset>

      {formError && <p className="rounded-2xl bg-[#ff6b8a]/8 px-4 py-3 text-sm leading-6 text-[#ff9bb0]" role="alert">{formError}</p>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        {actions}
        <NeumorphicButton type="submit" variant="accent" size="lg" className={cn("w-full", !fullWidthSubmit && "sm:w-auto")} disabled={isSubmitting || disabled}>
          {isSubmitting && <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />}
          {isSubmitting ? submittingLabel : submitLabel}
        </NeumorphicButton>
      </div>
    </form>
  );
}
