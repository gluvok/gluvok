/**
 * @file components/projects/columns/helpers.tsx
 * @description Column definitions and rendering helpers for the Helpers entity table.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/data-table"
import { EntityKey } from "@/lib/constants/enums"
import { ColumnLabel } from "@/lib/constants/enums"

export function createBaseColumn<T>(
  key: EntityKey | string, label: ColumnLabel | string, Icon: React.ComponentType<{ className?: string }>, cell: ColumnDef<T>["cell"], id?: string
): ColumnDef<T> {
  const colId = id || (key as string)
  return {
    id: colId,
    accessorKey: key as any,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={<span className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />{label}</span>}
      />
    ),
    cell,
    meta: { icon: Icon, label },
  }
}

export function createCustomColumn<T>(
  key: EntityKey | string, label: ColumnLabel | string, Icon: React.ComponentType<{ className?: string }>, renderCell: (value: string, row: T) => React.ReactNode, id?: string
): ColumnDef<T> {
  const colId = id || (key as string)
  return createBaseColumn(key, label, Icon, ({ row }) => {
    const val = (row.original as Record<string, unknown>)[key as string]
    return renderCell(String(val ?? ""), row.original)
  }, colId)
}

export function createTextColumn<T>(
  key: EntityKey | string, label: ColumnLabel | string, Icon: React.ComponentType<{ className?: string }>, className = "font-semibold text-foreground text-xs", id?: string
): ColumnDef<T> {
  const colId = id || (key as string)
  return createBaseColumn(key, label, Icon, ({ row }) => {
    const val = (row.original as Record<string, unknown>)[key as string]
    return <div className={className}>{String(val ?? "")}</div>
  }, colId)
}

export function createIdColumn<T>(
  key: EntityKey | string,
  label: ColumnLabel | string,
  Icon: React.ComponentType<{ className?: string }>,
  id?: string
): ColumnDef<T> {
  const colId = id || (key as string)
  return {
    id: colId,
    accessorFn: (row: T) => {
      const record = row as Record<string, unknown>
      const val = record[key as string]
      return val ? String(val) : ""
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={<span className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />{label}</span>}
      />
    ),
    cell: ({ row }) => {
      const val = row.getValue(colId) as string
      return <div className="font-mono text-muted-foreground text-xs">{val || "—"}</div>
    },
    meta: { icon: Icon, label },
  }
}

export const badgeBaseClass = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold shadow-sm"
