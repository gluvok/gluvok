/**
 * @file components/projects/columns/helpers.tsx
 * @description Column definitions and rendering helpers for the Helpers entity table.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { type ColumnDef, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { DataTableColumnHeader } from "@/components/data-table";

export function createBaseColumn<T extends RowData>(
  key: string,
  label: string,
  Icon: React.ComponentType<{ className?: string }>,
  cell: ColumnDef<ProjectTableFeatures, T, any>["cell"],
  id?: string,
): ColumnDef<ProjectTableFeatures, T, any> {
  const colId = id || key;
  return {
    id: colId,
    accessorKey: key as any,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={
          <span className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
            {label}
          </span>
        }
      />
    ),
    cell,
    meta: { icon: Icon, label },
  };
}

export function createCustomColumn<T extends RowData>(
  key: string,
  label: string,
  Icon: React.ComponentType<{ className?: string }>,
  renderCell: (value: string, row: T) => React.ReactNode,
  id?: string,
): ColumnDef<ProjectTableFeatures, T, any> {
  const colId = id || key;
  return createBaseColumn(
    key,
    label,
    Icon,
    ({ row }) => {
      const val = (row.original as Record<string, unknown>)[key];
      return renderCell(String(val ?? ""), row.original as T);
    },
    colId,
  );
}

export function createTextColumn<T extends RowData>(
  key: string,
  label: string,
  Icon: React.ComponentType<{ className?: string }>,
  className = "font-semibold text-foreground text-xs",
  id?: string,
): ColumnDef<ProjectTableFeatures, T, any> {
  const colId = id || key;
  return createBaseColumn(
    key,
    label,
    Icon,
    ({ row }) => {
      const val = (row.original as Record<string, unknown>)[key];
      return <div className={className}>{String(val ?? "")}</div>;
    },
    colId,
  );
}

export function createIdColumn<T extends RowData>(
  key: string,
  label: string,
  Icon: React.ComponentType<{ className?: string }>,
  id?: string,
): ColumnDef<ProjectTableFeatures, T, any> {
  const colId = id || key;
  return {
    id: colId,
    accessorFn: (row: T) => {
      const record = row as Record<string, unknown>;
      const val = record[key];
      return val ? String(val) : "";
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={
          <span className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
            {label}
          </span>
        }
      />
    ),
    cell: ({ row }) => {
      const val = row.getValue(colId) as string;
      return <div className="font-mono text-muted-foreground text-xs">{val || "—"}</div>;
    },
    meta: { icon: Icon, label },
  };
}

export const badgeBaseClass =
  "inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold shadow-sm";
