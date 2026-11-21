"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { CalendarIcon, CheckIcon, ChevronDownIcon, ClockIcon, CloseIcon } from "@/components/ui/icons";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { DynamicSelect } from "./DynamicSelect";
import { addCalendarDays, calendarMonth, formatPickerValue, padDatePart, persianCalendarLabel, persianDateParts, persianToGregorian, pickerValueError, PERSIAN_MONTHS, PERSIAN_WEEKDAYS, tehranDateTime, tehranToISO, toLatinDigits, validPickerValue, type DateTimeMode } from "@/lib/date-time";
import styles from "./DynamicDateTimePicker.module.css";

type Props = { id: string; mode: DateTimeMode; value: string; min?: string; max?: string; required?: boolean; showSeconds: boolean; onClose: () => void; onApply: (value: string) => void };

function ClockPart({ label, value, max, onChange }: { label: string; value: string; max: number; onChange: (value: string) => void }) {
  function step(delta: number) { onChange(padDatePart((Number(value) + delta + max + 1) % (max + 1))); }
  return <div className={styles.clockPart}>
    <button type="button" className={styles.step} aria-label={`Increase ${label.toLowerCase()}`} onClick={() => step(1)}><ChevronDownIcon /></button>
    <input type="text" inputMode="numeric" maxLength={2} value={value} aria-label={label} autoComplete="off" onChange={event => { const digits = toLatinDigits(event.target.value); if (/^\d{0,2}$/.test(digits)) onChange(digits); }} onFocus={event => event.target.select()} onBlur={() => { if (value !== "" && Number(value) <= max) onChange(padDatePart(Number(value))); }} onKeyDown={event => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); step(event.key === "ArrowUp" ? 1 : -1); } }} />
    <button type="button" className={styles.step} aria-label={`Decrease ${label.toLowerCase()}`} onClick={() => step(-1)}><ChevronDownIcon /></button>
    <span>{label}</span>
  </div>;
}

export function DateTimePanel({ id, mode, value, min, max, required, showSeconds, onClose, onApply }: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const shouldFocusDay = useRef(false);
  const [portal, setPortal] = useState<HTMLDialogElement | null>(null);
  const bindDialog = useCallback((element: HTMLDialogElement | null) => { dialogRef.current = element; setPortal(element); }, []);
  const [today] = useState(() => tehranDateTime(Date.now())!);
  const [seed] = useState(() => {
    const now = mode === "date" ? today.date : mode === "time" ? `${today.hour}:${today.minute}` : new Date().toISOString();
    const initial = value && validPickerValue(value, mode) ? value : min && pickerValueError(now, mode, min) ? min : max && pickerValueError(now, mode, undefined, max) ? max : "";
    if (mode === "datetime") return (initial && tehranDateTime(initial)) || today;
    if (mode === "date") return { ...today, date: initial || today.date };
    const [hour, minute, second] = (initial || `${today.hour}:${today.minute}:${today.second}`).split(":");
    return { ...today, hour, minute, second: second || "00" };
  });
  const [draftDate, setDraftDate] = useState(seed.date);
  const [hour, setHour] = useState(seed.hour);
  const [minute, setMinute] = useState(seed.minute);
  const [second, setSecond] = useState(seed.second);
  const [view, setView] = useState(() => persianDateParts(seed.date));
  const [focusedDate, setFocusedDate] = useState(seed.date);
  const [error, setError] = useState("");
  const cells = useMemo(() => calendarMonth(view.year, view.month), [view.year, view.month]);
  const minDate = min && validPickerValue(min, mode) ? mode === "datetime" ? tehranDateTime(min)?.date : mode === "date" ? min : undefined : undefined;
  const maxDate = max && validPickerValue(max, mode) ? mode === "datetime" ? tehranDateTime(max)?.date : mode === "date" ? max : undefined : undefined;
  const yearNow = persianDateParts(today.date).year;
  const firstYear = minDate ? persianDateParts(minDate).year : Math.max(1, Math.min(yearNow - 100, view.year));
  const lastYear = maxDate ? persianDateParts(maxDate).year : Math.max(yearNow + 25, view.year);
  const years = Array.from({ length: Math.max(1, lastYear - firstYear + 1) }, (_, index) => ({ value: String(firstYear + index), label: String(firstYear + index) }));
  const unavailable = (date: string) => Boolean(minDate && date < minDate || maxDate && date > maxDate);
  function moveView(year: number, month: number) {
    const lower = minDate && year === persianDateParts(minDate).year ? persianDateParts(minDate).month : 1;
    const upper = maxDate && year === persianDateParts(maxDate).year ? persianDateParts(maxDate).month : 12;
    const nextMonth = Math.max(lower, Math.min(upper, month));
    const first = persianToGregorian({ year, month: nextMonth, day: 1 });
    if (!first) return;
    setView({ year, month: nextMonth, day: 1 });
    setFocusedDate(minDate && first < minDate ? minDate : first);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    (dialog.querySelector<HTMLElement>("[data-selected-day='true']:not(:disabled)") ?? dialog.querySelector<HTMLElement>("[data-cancel]"))?.focus({ preventScroll: true });
    const viewport = window.visualViewport;
    function fitViewport() {
      const height = viewport?.height ?? innerHeight;
      dialog!.style.setProperty("--picker-viewport-height", `${height}px`);
      dialog!.style.setProperty("--picker-keyboard-inset", `${Math.max(0, innerHeight - height - (viewport?.offsetTop ?? 0))}px`);
    }
    fitViewport();
    viewport?.addEventListener("resize", fitViewport);
    viewport?.addEventListener("scroll", fitViewport);
    window.addEventListener("resize", fitViewport);
    return () => {
      viewport?.removeEventListener("resize", fitViewport); viewport?.removeEventListener("scroll", fitViewport); window.removeEventListener("resize", fitViewport);
      if (dialog.open) dialog.close(); document.body.style.overflow = overflow; if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => { if (error) errorRef.current?.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); }, [error]);

  useEffect(() => {
    if (!shouldFocusDay.current) return;
    shouldFocusDay.current = false;
    gridRef.current?.querySelector<HTMLElement>(`[data-date='${focusedDate}']:not(:disabled)`)?.focus({ preventScroll: true });
  }, [focusedDate, view]);

  function selectDate(date: string, focus = false) {
    if (unavailable(date)) return;
    shouldFocusDay.current = focus;
    setDraftDate(date); setFocusedDate(date); setView(persianDateParts(date)); setError("");
  }
  function month(delta: number) {
    const total = view.year * 12 + view.month - 1 + delta;
    const year = Math.floor(total / 12), nextMonth = total % 12 + 1;
    if (year < firstYear || year > lastYear) return;
    moveView(year, nextMonth);
  }
  function dayKeys(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    let next = "";
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) next = addCalendarDays(date, { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key]!);
    if (event.key === "Home" || event.key === "End") { const offset = (new Date(`${date}T12:00:00Z`).getUTCDay() + 1) % 7; next = addCalendarDays(date, event.key === "Home" ? -offset : 6 - offset); }
    if (event.key === "PageUp" || event.key === "PageDown") {
      const p = persianDateParts(date), total = p.year * 12 + p.month - 1 + (event.key === "PageUp" ? -1 : 1) * (event.shiftKey ? 12 : 1);
      const target = { year: Math.floor(total / 12), month: total % 12 + 1, day: p.day };
      for (; target.day > 0 && !next; target.day--) next = persianToGregorian(target) || "";
    }
    if (!next) return;
    event.preventDefault();
    if (unavailable(next)) return;
    shouldFocusDay.current = true; setFocusedDate(next); setView(persianDateParts(next));
  }
  function apply() {
    const clock = `${padDatePart(Number(hour))}:${padDatePart(Number(minute))}${showSeconds ? `:${padDatePart(Number(second))}` : ""}`;
    if (mode !== "date" && (hour === "" || minute === "" || showSeconds && second === "" || !validPickerValue(clock, "time"))) { setError("Use hours from 00 to 23 and minutes and seconds from 00 to 59."); return; }
    const unchanged = draftDate === seed.date && hour === seed.hour && minute === seed.minute && (!showSeconds || second === seed.second);
    const next = mode === "date" ? draftDate : unchanged && validPickerValue(value, mode) ? value : mode === "time" ? clock : tehranToISO(draftDate, clock);
    if (!next) { setError("This time does not exist in the Tehran time zone. Choose another time."); return; }
    const issue = pickerValueError(next, mode, min, max, required);
    if (issue) { setError(issue); return; }
    onApply(next);
  }
  function backdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
  }
  function panelKeys(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.defaultPrevented) return;
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); return; }
    if (event.key !== "Tab") return;
    const panel = event.currentTarget;
    const controls = Array.from(panel.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea, [tabindex]"))
      .filter(element => !element.matches(":disabled") && !element.closest("[hidden], [inert], [aria-hidden='true']") && element.tabIndex >= 0 && element.getClientRects().length > 0);
    const first = controls[0], last = controls.at(-1);
    if (!first || !panel.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
    else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  return createPortal(<dialog ref={bindDialog} id={id} className={styles.dialog} dir="ltr" lang="en" aria-labelledby={titleId} aria-describedby={descriptionId} onClick={backdrop} onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }} onKeyDown={panelKeys}>
    <header className={styles.header}><span className={`neo-inset ${styles.headerIcon}`} aria-hidden="true">{mode === "time" ? <ClockIcon /> : <CalendarIcon />}</span><div><h2 id={titleId}>{mode === "time" ? "Choose time" : mode === "date" ? "Choose Jalali date" : "Choose date and time"}</h2><p id={descriptionId}>{mode === "time" ? "24-hour clock" : "Jalali calendar"} · Tehran time</p></div><button type="button" className={`neo-icon-button ${styles.close}`} aria-label="Close date and time picker" onClick={onClose}><CloseIcon /></button></header>
    <div className={styles.body}>
      {mode !== "time" && <>
        <div className={styles.calendarNav}>
          <button type="button" className={`neo-icon-button ${styles.monthButton}`} aria-label="Previous month" disabled={view.year === firstYear && view.month === (minDate ? persianDateParts(minDate).month : 1)} onClick={() => month(-1)}><ChevronDownIcon /></button>
          <div className={styles.selects}><DynamicSelect aria-label="Month" value={String(view.month)} options={PERSIAN_MONTHS.map((label,index)=>({label,value:String(index+1),disabled:Boolean(minDate && view.year === persianDateParts(minDate).year && index + 1 < persianDateParts(minDate).month || maxDate && view.year === persianDateParts(maxDate).year && index + 1 > persianDateParts(maxDate).month)}))} onChange={event=>moveView(view.year,Number(event.target.value))} portalContainer={portal} /><DynamicSelect aria-label="Year" value={String(view.year)} options={years} onChange={event=>moveView(Number(event.target.value),view.month)} portalContainer={portal} /></div>
          <button type="button" className={`neo-icon-button ${styles.monthButton}`} aria-label="Next month" disabled={view.year === lastYear && view.month === (maxDate ? persianDateParts(maxDate).month : 12)} onClick={() => month(1)}><ChevronDownIcon /></button>
        </div>
        <p role="status" className="sr-only">{PERSIAN_MONTHS[view.month - 1]} {view.year}</p>
        <div ref={gridRef} role="grid" aria-label={`${PERSIAN_MONTHS[view.month - 1]} ${view.year}`} className={styles.calendar}>
          <div role="row" className={styles.weekdays}>{PERSIAN_WEEKDAYS.map(day=><span role="columnheader" key={day} aria-label={day}>{day.slice(0, 3).toUpperCase()}</span>)}</div>
          {Array.from({length:6},(_,row)=><div role="row" className={styles.week} key={row}>{cells.slice(row*7,row*7+7).map(cell=><button type="button" role="gridcell" key={cell.date} data-date={cell.date} data-selected-day={draftDate===cell.date} data-outside={cell.month!==view.month} aria-label={persianCalendarLabel(cell.date)} aria-selected={draftDate===cell.date} aria-current={cell.date===today.date?"date":undefined} disabled={unavailable(cell.date)} tabIndex={cell.date===focusedDate&&!unavailable(cell.date)?0:-1} onClick={()=>selectDate(cell.date)} onKeyDown={event=>dayKeys(event,cell.date)}>{cell.day}</button>)}</div>)}
        </div>
        <div className={styles.dayActions}><NeumorphicButton size="sm" disabled={unavailable(today.date)} onClick={()=>selectDate(today.date,true)}>Today</NeumorphicButton><span>{formatPickerValue(draftDate,"date")}</span></div>
      </>}
      {mode !== "date" && <section className={styles.timeSection} aria-label="Choose time">
        <div className={styles.timeHeading}><ClockIcon /><strong>Set time</strong><span>24-hour</span></div>
        <div className={styles.clock} dir="ltr"><ClockPart label="Hours" value={hour} max={23} onChange={next=>{setHour(next);setError("");}}/><span className={styles.colon}>:</span><ClockPart label="Minutes" value={minute} max={59} onChange={next=>{setMinute(next);setError("");}}/>{showSeconds&&<><span className={styles.colon}>:</span><ClockPart label="Seconds" value={second} max={59} onChange={next=>{setSecond(next);setError("");}}/></>}</div>
        <button type="button" className={styles.now} onClick={()=>{const now=tehranDateTime(Date.now())!;if(mode!=="time")selectDate(now.date);setHour(now.hour);setMinute(now.minute);setSecond(now.second);setError("");}}>Use current Tehran time</button>
      </section>}
      {error&&<p ref={errorRef} role="alert" className={styles.panelError}>{error}</p>}
    </div>
    <footer className={styles.footer}><NeumorphicButton variant="accent" onClick={apply}><CheckIcon className="size-4"/>Apply</NeumorphicButton><NeumorphicButton data-cancel onClick={onClose}>Cancel</NeumorphicButton>{!required&&<button type="button" className={styles.clear} onClick={()=>onApply("")}>Clear</button>}</footer>
  </dialog>,document.body);
}
