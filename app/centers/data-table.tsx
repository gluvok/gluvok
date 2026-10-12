"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useTable,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, RefreshIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { columns } from "./columns";
import { features } from "@/components/data-table/data-table-features";
import { type Center } from "./types";

const SKELETON_CLASSES = [
  "size-4 rounded-xs",
  "h-4 w-6",
  "h-4 w-36",
  "h-4 w-16",
  "h-4 w-24",
  "size-6 rounded-md",
];

export function CentersDataTable() {
  const [data, setData] = useState<Center[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const fetchCenters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/centers");
      if (!res.ok) {
        const errPayload = await res.json().catch(() => ({}));
        throw new Error(errPayload.error || `HTTP ${res.status}: Failed to fetch centers`);
      }
      const json = await res.json();
      setData(json.data ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCenters();
  }, [fetchCenters]);

  const table = useTable({
    features,
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <Input
            placeholder="Filter centers by name..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
            className="h-8 max-w-xs text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCenters()}
            disabled={loading}
            className="h-8 gap-1 px-2.5 text-xs"
          >
            <HugeiconsIcon
              icon={RefreshIcon}
              data-icon="inline-start"
              className={cn(loading && "animate-spin")}
            />
            <span>Refresh</span>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <DataTableViewOptions table={table} />
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {SKELETON_CLASSES.map((cls, colIndex) => (
                    <TableCell key={`col-${colIndex}`}>
                      <Skeleton className={cls} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-28 text-center text-destructive">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <HugeiconsIcon icon={AlertCircleIcon} className="size-5" />
                    <span className="text-xs">{error}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchCenters()}
                      className="mt-1"
                    >
                      Try again
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-xs text-muted-foreground"
                >
                  No centers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && !error && <DataTablePagination table={table} />}
    </div>
  );
}
