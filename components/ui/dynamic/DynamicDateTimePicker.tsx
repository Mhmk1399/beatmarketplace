"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState } from "react";
import { CalendarIcon, ClockIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { formatPickerValue, pickerValueError, type DateTimeMode } from "@/lib/date-time";
import styles from "./DynamicDateTimePicker.module.css";

const PickerPanel = dynamic(() => import("./DateTimePanel").then(module => module.DateTimePanel), { ssr: false });

export type DynamicDateTimePickerProps = {
  value: string;
  onValueChange: (value: string) => void;
  mode?: DateTimeMode;
  id?: string;
  name?: string;
  label?: string;
  hint?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  showSeconds?: boolean;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  error?: string;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

/** Controlled values: ISO UTC for datetime, YYYY-MM-DD for dates, HH:mm[:ss] for times. */
export function DynamicDateTimePicker({ mode = "datetime", showSeconds = false, ...props }: DynamicDateTimePickerProps) {
  const generated = useId();
  const id = props.id ?? `date-time-${generated}`;
  const trigger = useRef<HTMLButtonElement>(null);
  const native = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [validation, setValidation] = useState("");
  const error = props.error || validation;
  const messageId = `${id}-message`;
  const placeholder = props.placeholder ?? (mode === "time" ? "انتخاب ساعت" : mode === "date" ? "انتخاب تاریخ شمسی" : "انتخاب تاریخ و ساعت");
  const describedBy = [props["aria-describedby"], error || props.hint ? messageId : undefined].filter(Boolean).join(" ") || undefined;

  useEffect(() => { native.current?.setCustomValidity(pickerValueError(props.value, mode, props.min, props.max, props.required)); }, [props.value, mode, props.min, props.max, props.required]);

  function show() {
    if (props.readOnly || trigger.current?.matches(":disabled")) return;
    setValidation("");
    setOpen(true);
  }

  return <div className={styles.field}>
    {props.label && <label htmlFor={id} className={styles.label}>{props.label}{props.required && <span aria-hidden="true"> *</span>}</label>}
    <input ref={native} type="text" className={styles.native} tabIndex={-1} aria-hidden="true" name={props.name} value={props.value} onChange={() => {}} readOnly={props.readOnly} required={props.required} disabled={props.disabled} onFocus={() => trigger.current?.focus()} onInvalid={event => { event.preventDefault(); setValidation(pickerValueError(props.value, mode, props.min, props.max, props.required)); trigger.current?.focus(); }} />
    <button ref={trigger} id={id} type="button" role="combobox" className={cn("neo-input-wrap", styles.trigger, (error || props["aria-invalid"]) && "neo-input-error", props.className)} dir="rtl" lang="fa" disabled={props.disabled} autoFocus={props.autoFocus} aria-label={props["aria-label"]} aria-describedby={describedBy} aria-invalid={Boolean(error || props["aria-invalid"])} aria-required={props.required} aria-readonly={props.readOnly || undefined} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? `${id}-dialog` : undefined} onClick={show} onKeyDown={event => { if (event.key === "ArrowDown" && !props.readOnly) { event.preventDefault(); show(); } }}>
      {mode === "time" ? <ClockIcon /> : <CalendarIcon />}
      <span className={!props.value ? styles.placeholder : undefined}>{formatPickerValue(props.value, mode, showSeconds) || placeholder}</span>
      {mode === "datetime" && <ClockIcon className={styles.trailing} />}
    </button>
    {(error || props.hint) && <p id={messageId} className={cn(styles.message, error && styles.error)} role={error ? "alert" : undefined}>{error || props.hint}</p>}
    {open && !props.disabled && <PickerPanel key={props.value} id={`${id}-dialog`} mode={mode} value={props.value} min={props.min} max={props.max} required={props.required} showSeconds={showSeconds} onClose={() => setOpen(false)} onApply={value => { setValidation(""); props.onValueChange(value); setOpen(false); }} />}
  </div>;
}

export function DynamicDatePicker(props: Omit<DynamicDateTimePickerProps, "mode" | "showSeconds">) { return <DynamicDateTimePicker {...props} mode="date" />; }
export function DynamicTimePicker(props: Omit<DynamicDateTimePickerProps, "mode">) { return <DynamicDateTimePicker {...props} mode="time" />; }
