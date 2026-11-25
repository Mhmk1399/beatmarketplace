/** Escape an RFC 4180 cell and neutralize spreadsheet formulas on open. */
export function safeCsvCell(value: string | number) {
  let text = String(value);
  if (/^[\t\r\n ]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export const MAX_SALES_EXPORT_ORDERS = 10_000;
export function salesExportExceedsLimit(recordCount: number) {
  return recordCount > MAX_SALES_EXPORT_ORDERS;
}
