"use client";
import { useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { FrequencyLoader } from "./GlobalLoading";

import { cn } from "@/lib/cn";

export type DynamicTableColumn<T> = {
  id: string;
  header: ReactNode;
  accessor?: keyof T;
  cell?: (row: T, rowIndex: number) => ReactNode;
  align?: "left" | "center" | "right";
  width?: CSSProperties["width"];
  className?: string;
  sort?: { active: boolean; onClick: () => void; label: string };
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
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  rowAction?: {
    label: (row: T) => string;
    onClick: (row: T) => void;
  };
  getRowLabel?: (row: T) => string;
  deleteLabel?: string;
  busy?: boolean;
};

function alignmentClass(alignment: DynamicTableColumn<unknown>["align"]) {
  if (alignment === "center") return "text-center";
  if (alignment === "right") return "text-right";
  return "text-left";
}

function renderCell<T>(
  column: DynamicTableColumn<T>,
  row: T,
  rowIndex: number,
) {
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
  onView,
  onEdit,
  onDelete,
  rowAction,
  getRowLabel,
  deleteLabel = "Delete",
  busy = false,
}: DynamicTableProps<T>) {
  const actions = Boolean(onView || onEdit || onDelete || rowAction);
  return (
    <div
      className={cn(
        "dynamic-table-shell neo-raised overflow-hidden rounded-[var(--radius-card)]",
        className,
      )}
      aria-busy={isLoading || busy}
    >
      <div className="overflow-x-auto">
        <table className="dynamic-table w-full border-collapse" role="table">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-divider">
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  style={{ width: column.width }}
                  className={cn(
                    "px-5 py-4 text-[10px] font-extrabold uppercase tracking-[0.16em] text-faint",
                    alignmentClass(column.align),
                    column.className,
                  )}
                  aria-sort={column.sort ? (column.sort.active ? "descending" : "none") : undefined}
                >
                  {column.sort ? <button type="button" onClick={column.sort.onClick} aria-label={column.sort.label} className="min-h-11 underline-offset-4 hover:underline focus-visible:underline">{column.header}{column.sort.active ? " ↓" : ""}</button> : column.header}
                </th>
              ))}
              {actions && (
                <th
                  scope="col"
                  className="px-5 py-4 text-right text-xs font-bold text-muted"
                >
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from(
                { length: Math.min(loadingRows, 3) },
                (_, rowIndex) => (
                  <tr
                    key={`loading-${rowIndex}`}
                    className="border-b border-[var(--hover-overlay)] last:border-0"
                    aria-hidden="true"
                  >
                    {columns.map((column) => (
                      <td key={column.id} className="px-5 py-4">
                        <span className="neo-inset block h-5 animate-pulse rounded-lg" />
                      </td>
                    ))}
                    {actions && <td />}
                  </tr>
                ),
              )
            ) : rows.length > 0 ? (
              rows.map((row, rowIndex) => (
                <tr
                  key={getRowKey(row, rowIndex)}
                  className={cn(
                    "border-b border-[var(--hover-overlay)] text-sm text-secondary transition-colors last:border-0 hover:bg-[var(--hover-subtle)]",
                    rowClassName?.(row, rowIndex),
                  )}
                >
                  {columns.map((column, index) => (
                    <td
                      key={column.id}
                      className={cn(
                        "dynamic-table-cell px-5 py-4",
                        index === 0 && "dynamic-table-primary",
                        alignmentClass(column.align),
                        column.className,
                      )}
                    >
                      <span className="dynamic-table-mobile-label">
                        {column.header}
                      </span>
                      <div className="dynamic-table-cell-content">
                        {renderCell(column, row, rowIndex)}
                      </div>
                    </td>
                  ))}
                  {actions && (
                    <td className="dynamic-table-actions px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {onView && (
                          <NeumorphicButton
                            size="sm"
                            variant="quiet"
                            disabled={busy}
                            aria-label={`View ${getRowLabel?.(row) ?? "record"}`}
                            onClick={() => onView(row)}
                          >
                            View
                          </NeumorphicButton>
                        )}
                        {onEdit && (
                          <NeumorphicButton
                            size="sm"
                            disabled={busy}
                            aria-label={`Edit ${getRowLabel?.(row) ?? "record"}`}
                            onClick={() => onEdit(row)}
                          >
                            Edit
                          </NeumorphicButton>
                        )}
                        {rowAction && (
                          <NeumorphicButton
                            size="sm"
                            variant="quiet"
                            disabled={busy}
                            aria-label={`${rowAction.label(row)} ${getRowLabel?.(row) ?? "record"}`}
                            onClick={() => rowAction.onClick(row)}
                          >
                            {rowAction.label(row)}
                          </NeumorphicButton>
                        )}
                        {onDelete && (
                          <NeumorphicButton
                            size="sm"
                            variant="quiet"
                            disabled={busy}
                            className="text-error-text"
                            aria-label={`${deleteLabel} ${getRowLabel?.(row) ?? "record"}`}
                            onClick={() => onDelete(row)}
                          >
                            {deleteLabel}
                          </NeumorphicButton>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="dynamic-table-empty px-6 py-14 text-center"
                >
                  <p className="font-extrabold text-secondary">{emptyTitle}</p>
                  <p className="mt-2 text-sm text-faint">{emptyDescription}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {isLoading && (
        <FrequencyLoader
          overlay={false}
          label={
            caption ? `Loading ${caption.toLowerCase()}…` : "Loading records…"
          }
        />
      )}
    </div>
  );
}

export function TableIdentity({
  image,
  title,
  subtitle,
}: {
  image?: string | null;
  title: string;
  subtitle?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span className="table-identity">
      <span className="table-identity-image neo-inset">
        <span aria-hidden="true">{title.slice(0, 2).toUpperCase()}</span>
        {image && failed !== image && <Image src={image} alt="" fill sizes="44px" unoptimized onError={() => setFailed(image)} />}
      </span>
      <span className="min-w-0">
        <strong>{title}</strong>
        {subtitle && <small>{subtitle}</small>}
      </span>
    </span>
  );
}
