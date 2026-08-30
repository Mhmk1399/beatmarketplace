import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/cn";

export type DynamicTableColumn<T> = {
  id: string;
  header: ReactNode;
  accessor?: keyof T;
  cell?: (row: T, rowIndex: number) => ReactNode;
  align?: "left" | "center" | "right";
  width?: CSSProperties["width"];
  className?: string;
};

type DynamicTableProps<T> = {
  columns: readonly DynamicTableColumn<T>[];
  rows: readonly T[];
  getRowKey: (row: T, rowIndex: number) => string;
  caption?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  isLoading?: boolean;
  loadingRows?: number;
  className?: string;
  rowClassName?: (row: T, rowIndex: number) => string | undefined;
};

function alignmentClass(alignment: DynamicTableColumn<unknown>["align"]) {
  if (alignment === "center") return "text-center";
  if (alignment === "right") return "text-right";
  return "text-left";
}

function renderCell<T>(column: DynamicTableColumn<T>, row: T, rowIndex: number) {
  if (column.cell) return column.cell(row, rowIndex);
  if (column.accessor) return String(row[column.accessor] ?? "");
  return null;
}

export function DynamicTable<T>({
  caption,
  className,
  columns,
  emptyDescription = "There is nothing to display yet.",
  emptyTitle = "No results",
  getRowKey,
  isLoading = false,
  loadingRows = 4,
  rowClassName,
  rows,
}: DynamicTableProps<T>) {
  return (
    <div className={cn("neo-raised overflow-hidden rounded-[26px]", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[42rem] border-collapse">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-white/[0.045]">
              {columns.map((column) => (
                <th key={column.id} scope="col" style={{ width: column.width }} className={cn("px-5 py-4 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#747a87]", alignmentClass(column.align), column.className)}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? Array.from({ length: loadingRows }, (_, rowIndex) => (
              <tr key={`loading-${rowIndex}`} className="border-b border-white/[0.035] last:border-0" aria-hidden="true">
                {columns.map((column) => <td key={column.id} className="px-5 py-4"><span className="neo-inset block h-5 animate-pulse rounded-lg" /></td>)}
              </tr>
            )) : rows.length > 0 ? rows.map((row, rowIndex) => (
              <tr key={getRowKey(row, rowIndex)} className={cn("border-b border-white/[0.035] text-sm text-[#c8c5ce] transition-colors last:border-0 hover:bg-white/[0.018]", rowClassName?.(row, rowIndex))}>
                {columns.map((column) => <td key={column.id} className={cn("px-5 py-4", alignmentClass(column.align), column.className)}>{renderCell(column, row, rowIndex)}</td>)}
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-14 text-center">
                  <p className="font-extrabold text-[#dcd9e1]">{emptyTitle}</p>
                  <p className="mt-2 text-sm text-[#7f8591]">{emptyDescription}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
