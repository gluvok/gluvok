"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  useTable,
  type ColumnVisibilityState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { DatePickerWithRange } from "@/components/data-table/date-range-picker";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { columns } from "./columns";
import { features } from "@/components/data-table/data-table-features";
import { useDebounce } from "@/hooks/use-debounce";
import { type Center } from "./types";

interface AutoApproveOption {
  label: string;
  value: string;
}

const AUTO_APPROVE_OPTIONS: AutoApproveOption[] = [
  { label: "All Auto Approve", value: "all" },
  { label: "Enabled", value: "true" },
  { label: "Disabled", value: "false" },
];

interface CentersApiResponse {
  data: Center[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function CentersDataTable() {
  const [data, setData] = useState<Center[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Server-controlled pagination and sorting
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([{ id: "id", desc: false }]);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Filter states
  const [search, setSearch] = useState<string>("");
  const debouncedSearch = useDebounce(search, 300);
  const [autoApproveFilter, setAutoApproveFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Reset pagination to first page whenever search query changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [debouncedSearch]);

  // Fetch centers via axios with full server-side query params
  const fetchCenters = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get<CentersApiResponse>("/api/centers", {
        params: {
          page: pagination.pageIndex + 1,
          pageSize: pagination.pageSize,
          ...(sorting.length > 0 && {
            sort: sorting[0].id,
            order: sorting[0].desc ? "desc" : "asc",
          }),
          ...(debouncedSearch && { search: debouncedSearch }),
          ...(autoApproveFilter !== "all" && { auto_approve: autoApproveFilter }),
          ...(dateRange?.from && { from: dateRange.from.toISOString() }),
          ...(dateRange?.to && { to: dateRange.to.toISOString() }),
        },
      });

      setData(response.data.data ?? []);
      setTotalCount(response.data.totalCount ?? 0);
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : err instanceof Error
            ? err.message
            : "An unexpected error occurred";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    sorting,
    debouncedSearch,
    autoApproveFilter,
    dateRange,
  ]);

  useEffect(() => {
    fetchCenters();
  }, [fetchCenters]);

  const table = useTable({
    features,
    data,
    columns,
    manualPagination: true,
    rowCount: totalCount,
    manualSorting: true,
    manualFiltering: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      pagination,
      sorting,
      columnVisibility,
      rowSelection,
    },
  });

  const hasActiveFilters = Boolean(autoApproveFilter !== "all" || dateRange?.from);

  const resetAllFilters = () => {
    setAutoApproveFilter("all");
    setDateRange(undefined);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const selectedAutoApproveOption =
    AUTO_APPROVE_OPTIONS.find((opt) => opt.value === autoApproveFilter) ?? AUTO_APPROVE_OPTIONS[0];

  return (
    <div className="flex flex-col gap-3.5">
      {/* Primary Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Filters Group (Left) */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input with Clear (Cross) Button */}
          <div className="relative">
            <HugeiconsIcon
              icon={Search01Icon}
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search centers by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-60 pl-8 pr-7 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Clear search"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
              </button>
            )}
          </div>

          {/* Auto Approve Filter Combobox */}
          <Combobox
            items={AUTO_APPROVE_OPTIONS}
            value={selectedAutoApproveOption}
            onValueChange={(val: AutoApproveOption | null) => {
              setAutoApproveFilter(val ? val.value : "all");
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            itemToStringValue={(item: AutoApproveOption) => item.label}
          >
            <ComboboxInput
              placeholder="Auto Approve filter"
              className="h-8 w-48 text-xs"
              showClear={autoApproveFilter !== "all"}
            />
            <ComboboxContent>
              <ComboboxEmpty>No options found.</ComboboxEmpty>
              <ComboboxList>
                {AUTO_APPROVE_OPTIONS.map((item) => (
                  <ComboboxItem key={item.value} value={item}>
                    {item.label}
                  </ComboboxItem>
                ))}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>

          {/* Date Range Picker for created_at */}
          <DatePickerWithRange
            date={dateRange}
            onDateChange={(range) => {
              setDateRange(range);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
          />
        </div>

        {/* Action Controls Group (Right) */}
        <div className="flex items-center gap-2">
          {/* Column Visibility Options */}
          <DataTableViewOptions table={table} />
        </div>
      </div>

      {/* Active Filter Chips Bar (Badges) - Secondary filters only */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/30 p-2">
          <span className="text-xs font-medium text-muted-foreground">Active Filters:</span>

          {/* Auto Approve Chip */}
          {autoApproveFilter !== "all" && (
            <Badge variant="secondary" className="gap-1.5 py-1 pl-2.5 pr-1.5 text-xs font-normal">
              <span className="text-muted-foreground">Auto Approve:</span>
              <span className="font-medium">
                {autoApproveFilter === "true" ? "Enabled" : "Disabled"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setAutoApproveFilter("all");
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
                aria-label="Remove auto approve filter"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
              </button>
            </Badge>
          )}

          {/* Date Range Chip */}
          {dateRange?.from && (
            <Badge variant="secondary" className="gap-1.5 py-1 pl-2.5 pr-1.5 text-xs font-normal">
              <span className="text-muted-foreground">Created:</span>
              <span className="font-medium">
                {dateRange.to
                  ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`
                  : format(dateRange.from, "LLL dd, y")}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDateRange(undefined);
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
                aria-label="Remove date range filter"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
              </button>
            </Badge>
          )}

          {/* Clear All Filters Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={resetAllFilters}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Compact Clean Table Container with Scoped Loading State */}
      <div className="overflow-hidden rounded-md border border-border bg-card">
        {error ? (
          <div className="flex h-72 items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-2 text-destructive">
              <HugeiconsIcon icon={AlertCircleIcon} className="size-5" />
              <span className="text-xs">{error}</span>
              <Button variant="outline" size="sm" onClick={() => fetchCenters()} className="mt-1">
                Try again
              </Button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex h-72 items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Spinner className="size-6 text-muted-foreground" />
              <span className="text-xs">Loading centers...</span>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="h-9 hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="h-9 px-3 text-xs font-semibold">
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
                    className="h-9 hover:bg-muted/40"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-3 py-1.5 text-xs">
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={table.getVisibleLeafColumns().length}
                    className="h-24 text-center text-xs text-muted-foreground"
                  >
                    No centers found matching the specified filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination Controls */}
      <DataTablePagination table={table} />
    </div>
  );
}
