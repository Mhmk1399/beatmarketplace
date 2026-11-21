/** Jalali calendar with English labels and Latin digits; API instants remain ISO UTC. */
export const DATE_TIME_ZONE = "Asia/Tehran";
export const PERSIAN_MONTHS = ["FARVARDIN", "ORDIBEHESHT", "KHORDAD", "TIR", "MORDAD", "SHAHRIVAR", "MEHR", "ABAN", "AZAR", "DEY", "BAHMAN", "ESFAND"] as const;
export const PERSIAN_WEEKDAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
export type CalendarDate = { year: number; month: number; day: number };
export type DateTimeMode = "date" | "time" | "datetime";
const DAY = 86_400_000;
const calendar = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", { timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric" });
const wallClock = new Intl.DateTimeFormat("en-US-u-ca-gregory-nu-latn", { timeZone: DATE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
const dateFormatter = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", { timeZone: DATE_TIME_ZONE, year: "numeric", month: "numeric", day: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("en-GB-u-nu-latn", { timeZone: DATE_TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export const padDatePart = (value: number) => String(value).padStart(2, "0");
export function toLatinDigits(value: string) { return value.replace(/[۰-۹٠-٩]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit) >= 0 ? "۰۱۲۳۴۵۶۷۸۹".indexOf(digit) : "٠١٢٣٤٥٦٧٨٩".indexOf(digit))); }
function numericParts(formatter: Intl.DateTimeFormat, date: Date) {
  return Object.fromEntries(formatter.formatToParts(date).filter(part => part.type !== "literal").map(part => [part.type, Number(part.value)])) as Record<string, number>;
}
function safeDate(value: string | number | Date | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}
function calendarDateLabel(parts: Record<string, number>) { return `${parts.day} ${PERSIAN_MONTHS[parts.month - 1]} ${parts.year}`; }
export function formatPersianDate(value: string | number | Date | null | undefined) { const date = safeDate(value); return date ? calendarDateLabel(numericParts(dateFormatter, date)) : "—"; }
export function formatPersianDateTime(value: string | number | Date | null | undefined) { const date = safeDate(value); return date ? `${calendarDateLabel(numericParts(dateFormatter, date))} · ${timeFormatter.format(date)}` : "—"; }
export function formatPersianYear(value: string | number | Date | null | undefined) { const date = safeDate(value); return date ? String(numericParts(dateFormatter, date).year) : "—"; }
export function formatPersianTime(value: string | number | Date | null | undefined) { const date = safeDate(value); return date ? timeFormatter.format(date) : "—"; }
export function isGregorianDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function persianDateParts(value: string): CalendarDate {
  if (!isGregorianDate(value)) throw new RangeError("Invalid Gregorian calendar date.");
  const parts = numericParts(calendar, new Date(`${value}T12:00:00Z`));
  return { year: parts.year, month: parts.month, day: parts.day };
}
/** Invert the platform's Persian calendar, so rendering and conversion use the same leap-year rules. */
export function persianToGregorian({ year, month, day }: CalendarDate): string | null {
  if (![year, month, day].every(Number.isInteger) || year < 1 || year > 9377 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  let lower = Math.floor(Date.UTC(year + 621, 0, 1) / DAY), upper = Math.floor(Date.UTC(year + 622, 11, 31) / DAY);
  const key = year * 10000 + month * 100 + day;
  while (lower <= upper) {
    const middle = Math.floor((lower + upper) / 2);
    const parts = numericParts(calendar, new Date(middle * DAY + DAY / 2));
    const comparison = parts.year * 10000 + parts.month * 100 + parts.day;
    if (comparison === key) return new Date(middle * DAY).toISOString().slice(0, 10);
    if (comparison < key) lower = middle + 1; else upper = middle - 1;
  }
  return null;
}
export function addCalendarDays(date: string, days: number) { return new Date(new Date(`${date}T12:00:00Z`).getTime() + days * DAY).toISOString().slice(0, 10); }
export function calendarMonth(year: number, month: number) {
  const first = persianToGregorian({ year, month, day: 1 });
  if (!first) return [];
  const start = addCalendarDays(first, -((new Date(`${first}T12:00:00Z`).getUTCDay() + 1) % 7));
  return Array.from({ length: 42 }, (_, index) => { const date = addCalendarDays(start, index); return { date, ...persianDateParts(date) }; });
}
export function persianCalendarLabel(date: string) {
  if (!isGregorianDate(date)) return "";
  const value = new Date(`${date}T12:00:00Z`);
  return `${PERSIAN_WEEKDAYS[(value.getUTCDay() + 1) % 7]}, ${calendarDateLabel(numericParts(calendar, value))}`;
}
export function tehranDateTime(value: string | number | Date) {
  const date = safeDate(value);
  if (!date) return null;
  const p = numericParts(wallClock, date);
  return { date: `${p.year}-${padDatePart(p.month)}-${padDatePart(p.day)}`, hour: padDatePart(p.hour), minute: padDatePart(p.minute), second: padDatePart(p.second) };
}
/** Resolve IANA timezone offsets rather than baking today's UTC offset into stored dates. */
export function tehranToISO(date: string, time: string): string | null {
  if (!isGregorianDate(date) || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time)) return null;
  const target = `${date}T${time.length === 5 ? `${time}:00` : time}`;
  const wall = Date.parse(`${target}Z`);
  let instant = wall;
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = tehranDateTime(instant)!;
    const resolved = `${parts.date}T${parts.hour}:${parts.minute}:${parts.second}`;
    if (resolved === target) return new Date(instant).toISOString();
    instant += wall - Date.parse(`${resolved}Z`);
  }
  return null; // A skipped wall-clock time during a historical DST transition.
}
export function validPickerValue(value: string, mode: DateTimeMode) {
  if (mode === "date") return isGregorianDate(value);
  if (mode === "time") return /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
  return /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && isGregorianDate(value.slice(0, 10)) && safeDate(value) !== null;
}
export function pickerValueError(value: string, mode: DateTimeMode, min?: string, max?: string, required = false) {
  if (!value) return required ? "Choose a date or time." : "";
  if (!validPickerValue(value, mode)) return "Enter a valid date or time.";
  const comparable = (item: string) => mode === "datetime" ? Date.parse(item) : mode === "time" ? `${item}:00`.slice(0, 8) : item;
  if (min && validPickerValue(min, mode) && comparable(value) < comparable(min)) return "Choose a value on or after the minimum.";
  if (max && validPickerValue(max, mode) && comparable(value) > comparable(max)) return "Choose a value on or before the maximum.";
  return "";
}
export function formatPickerValue(value: string, mode: DateTimeMode, showSeconds = false) {
  if (!validPickerValue(value, mode)) return "";
  if (mode === "date") return formatPersianDate(`${value}T12:00:00Z`);
  if (mode === "time") return showSeconds ? `${value}:00`.slice(0, 8) : value.slice(0, 5);
  const formatted = formatPersianDateTime(value);
  const clock = tehranDateTime(value)!;
  return showSeconds ? `${formatPersianDate(value)} · ${clock.hour}:${clock.minute}:${clock.second}` : formatted;
}
