# Shared Persian date and time controls

Use the shared controls for every calendar or wall-clock input. They use the existing global clay materials, colors, controls and focus styles; no separate theme or calendar package is required.

```tsx
import { DynamicDateTimePicker, DynamicDatePicker, DynamicTimePicker } from "@/components/ui/dynamic";

<DynamicDateTimePicker
  label="زمان شروع"
  name="startsAt"
  value={startsAt}
  onValueChange={setStartsAt}
  required
  showSeconds
/>
<DynamicDatePicker label="تاریخ" value={day} onValueChange={setDay} />
<DynamicTimePicker label="ساعت" value={clock} onValueChange={setClock} min="09:00" max="17:00" />
```

| Control | Controlled value and form submission | Display |
| --- | --- | --- |
| `DynamicDateTimePicker` | ISO instant with timezone, preferably UTC, e.g. `2026-11-18T09:00:00.000Z` | Persian calendar, Tehran wall-clock time |
| `DynamicDatePicker` | Gregorian date-only `YYYY-MM-DD`, e.g. `2026-11-18` | Persian calendar date |
| `DynamicTimePicker` | 24-hour `HH:mm`, or `HH:mm:ss` with `showSeconds` | Persian digits |

All controls are controlled components: use `""` for an empty value. `min` and `max` use the same representation as `value`, and are inclusive. Optional fields can be cleared. `required`, `disabled` (including a parent fieldset), `readOnly`, `error`, `hint`, `id`, `name` and ARIA labels are supported. `name` participates in native `FormData`; native form validation focuses the visible control and displays an accessible error. Server validation remains necessary for all submitted values.

`DynamicForm` automatically uses these controls for `type: "date"`, `type: "time"` and `type: "datetime-local"`. The last type accepts ISO instants rather than browser-local datetime strings. Existing date fields retain their Gregorian date-only values.

Date selection is a draft until confirmed. Closing, Escape, backdrop and Cancel discard it. The native modal keeps keyboard focus contained and restores it to the invoking field, including inside `DynamicModal`. It adapts to small screens and the mobile visual viewport/keyboard. Inputs use at least 16px text. The calendar panel loads on demand, with no listeners or day grids mounted for closed fields.

Weeks start on Saturday. The calendar supports previous/next month, month and year selectors, Today, arrow-key day movement (right moves to the previous day in RTL), Home/End for week boundaries, Page Up/Down for months, and Shift + Page Up/Down for years. Enter/Space selects a focused day. The clock accepts Persian, Arabic and Latin digits, 24-hour hours, optional seconds and keyboard/touch increment controls.

`DynamicSelect` accepts an optional `portalContainer`. The calendar uses its native dialog as that container so month/year menus stay interactive in the browser's modal top layer. Other selectors keep their existing document-body portal.

## Display and persistence

Use `formatPersianDate`, `formatPersianDateTime` and `formatPersianTime` from `@/lib/date-time` for rendered dates and timestamps. Invalid or absent dates render an em dash. These functions pin both calendar and timezone, so server rendering and clients in different timezones produce the same text.

Scheduling forms keep ISO instants in state and send UTC to the existing APIs. They never parse a Persian display string or reinterpret a naive datetime in the browser's timezone. Confirming an existing value without changing its date/time preserves its original ISO string and precision, including milliseconds. Native clock offsets are resolved through `Asia/Tehran` rather than a hard-coded offset; invalid historical DST wall-clock times are rejected.

Calendar conversion and rendering use the same Persian calendar implementation through [ECMA-402 Intl.DateTimeFormat](https://tc39.es/ecma402/#datetimeformat-objects). Tests cover Nowruz, leap/non-leap Esfand, consecutive Saturday-based grids, midnight/seconds, historical timezone offsets, bounds and invalid dates. Internal Gregorian aggregation keys, ISO payloads and audio durations are separate from calendar display and retain their existing formats.
