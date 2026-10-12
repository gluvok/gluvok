"use client";

import type { ReactTable, RowData } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { type DataTableFeatures } from "./data-table-features";
import { cn } from "@/lib/utils";

export interface DataTableContentProps<TData extends RowData> {
  table: ReactTable<DataTableFeatures, TData>;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyMessage?: string;
  loadingMessage?: string;
  className?: string;
}

export function DataTableContent<TData extends RowData>({
  table,
  loading = false,
  error = null,
  onRetry,
  emptyMessage = "No results found matching your filters.",
  loadingMessage = "Loading records...",
  className,
}: DataTableContentProps<TData>) {
  return (
    <div className={cn("overflow-hidden rounded-md border border-border bg-card", className)}>
      {error ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center justify-center gap-2 text-destructive">
            <HugeiconsIcon icon={AlertCircleIcon} className="size-5" />
            <span className="text-xs">{error}</span>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
                Try again
              </Button>
            )}
          </div>
        </div>
      ) : loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Spinner className="size-6 text-muted-foreground" />
            <span className="text-xs">{loadingMessage}</span>
          </div>
        </div>
      ) : (
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="h-8 hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-8 px-3 text-xs font-semibold">
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="h-8 hover:bg-muted/40"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-3 py-1 text-xs">
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-20 text-center text-xs text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
