"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  useTable,
  type ColumnVisibilityState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DataTableSearchInput } from "@/components/data-table/data-table-search-input";
import {
  DataTableFacetedFilter,
  type FacetedFilterOption,
} from "@/components/data-table/data-table-faceted-filter";
import { DataTableCriteriaBar } from "@/components/data-table/data-table-criteria-bar";
import { DataTableContent } from "@/components/data-table/data-table-content";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { DatePickerWithRange } from "@/components/data-table/date-range-picker";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar01Icon,
  Cancel01Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  HashtagIcon,
  Layers01Icon,
  TextFontIcon,
  ToggleOnIcon,
} from "@hugeicons/core-free-icons";
import { columns } from "./columns";
import { features } from "@/components/data-table/data-table-features";
import { useDebounce } from "@/hooks/use-debounce";
import {
  DEFAULT_TABLE_ITEM_STATE,
  useDataTableStore,
  useTableHydrated,
} from "@/stores/use-data-table-store";
import { type Center } from "./types";

const AUTO_APPROVE_OPTIONS: FacetedFilterOption[] = [
  { label: "All Auto Approve", value: "all", icon: Layers01Icon },
  { label: "Enabled", value: "true", icon: CheckmarkCircle02Icon },
  { label: "Disabled", value: "false", icon: CancelCircleIcon },
];

interface CentersApiResponse {
  data: Center[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const TABLE_ID = "centers";

const COLUMN_LABELS: Record<string, string> = {
  id: "ID",
  name: "Name",
  auto_approve: "Auto Approve",
  created_at: "Created At",
  updated_at: "Updated At",
};

const COLUMN_ICONS: Record<string, unknown> = {
  id: HashtagIcon,
  name: TextFontIcon,
  auto_approve: ToggleOnIcon,
  created_at: Calendar01Icon,
  updated_at: Clock01Icon,
};

export function CentersDataTable() {
  const hasHydrated = useTableHydrated();
  const store = useDataTableStore();
  const tableState = store.tables[TABLE_ID] ?? DEFAULT_TABLE_ITEM_STATE;

  const [data, setData] = useState<Center[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Read persisted state for 'centers' table from store
  const search = tableState.search;
  const autoApproveFilter = tableState.filters["auto_approve"] ?? "all";
  const dateRange = useMemo<DateRange | undefined>(() => {
    if (!tableState.dateRange?.from) return undefined;
    return {
      from: new Date(tableState.dateRange.from),
      to: tableState.dateRange.to ? new Date(tableState.dateRange.to) : undefined,
    };
  }, [tableState.dateRange]);
  const sorting = tableState.sorting;
  const pagination = tableState.pagination;
  const columnVisibility = tableState.columnVisibility;
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const debouncedSearch = useDebounce(search, 300);

  // Actions updating persisted store
  const setSearch = (val: string) => store.setTableSearch(TABLE_ID, val);
  const setAutoApproveFilter = (val: string) => store.setTableFilter(TABLE_ID, "auto_approve", val);
  const setDateRange = (range: DateRange | undefined) =>
    store.setTableDateRange(
      TABLE_ID,
      range ? { from: range.from?.toISOString(), to: range.to?.toISOString() } : undefined,
    );
  const setSorting = (updater: Updater<SortingState>) => store.setTableSorting(TABLE_ID, updater);
  const removeSort = (columnId: string) => store.removeTableSort(TABLE_ID, columnId);
  const resetSorting = () => store.resetTableSorting(TABLE_ID);
  const setPagination = (updater: Updater<PaginationState>) =>
    store.setTablePagination(TABLE_ID, updater);
  const setColumnVisibility = (updater: Updater<ColumnVisibilityState>) =>
    store.setTableColumnVisibility(TABLE_ID, updater);
  const resetAllFilters = () => store.resetTableFilters(TABLE_ID);
  const resetAllCriteria = () => {
    resetAllFilters();
    resetSorting();
  };

  // Fetch centers via axios with strict multi-column sorting and filtering
  const fetchCenters = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get<CentersApiResponse>("/api/centers", {
        params: {
          page: pagination.pageIndex + 1,
          pageSize: pagination.pageSize,
          ...(sorting.length > 0 && {
            sort: sorting.map((s) => `${s.id}.${s.desc ? "desc" : "asc"}`).join(","),
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
    if (!hasHydrated) return;
    fetchCenters();
  }, [hasHydrated, fetchCenters]);

  const table = useTable({
    features,
    data,
    columns,
    manualPagination: true,
    rowCount: totalCount,
    manualSorting: true,
    manualFiltering: true,
    enableMultiSort: true,
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

  const isDefaultSort = sorting.length === 1 && sorting[0].id === "id" && sorting[0].desc === true;
  const hasActiveSorts = !isDefaultSort && sorting.length > 0;
  const hasActiveFilters = Boolean(autoApproveFilter !== "all" || dateRange?.from);

  // Hydration guard: show clean centered spinner until localStorage is hydrated
  if (!hasHydrated) {
    return (
      <div className="flex h-64 items-center justify-center rounded-md border border-border bg-card">
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Spinner className="size-6 text-muted-foreground" />
          <span className="text-xs">Loading table preferences...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Primary Toolbar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Filters Group (Left) */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full sm:w-auto">
          {/* Search Input with Clear Button */}
          <DataTableSearchInput
            placeholder="Search centers by name..."
            value={search}
            onChange={setSearch}
          />

          {/* Auto Approve Filter Combobox */}
          <DataTableFacetedFilter
            title="Auto Approve"
            options={AUTO_APPROVE_OPTIONS}
            value={autoApproveFilter}
            onValueChange={(val) => {
              setAutoApproveFilter(val);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
          />
        </div>

        {/* Action Controls Group (Right) */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          <DatePickerWithRange
            date={dateRange}
            onDateChange={(range) => {
              setDateRange(range);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            className="flex-1 sm:flex-initial"
          />

          <DataTableViewOptions table={table} />
        </div>
      </div>

      {/* Active Criteria Bar (Badges + Drag-and-Drop Sort Priority Chips) */}
      <DataTableCriteriaBar
        hasActiveFilters={hasActiveFilters}
        hasActiveSorts={hasActiveSorts}
        sorting={sorting}
        onSortingChange={(updater) => {
          setSorting(updater);
          setPagination((prev) => ({ ...prev, pageIndex: 0 }));
        }}
        onRemoveSort={(columnId) => {
          removeSort(columnId);
          setPagination((prev) => ({ ...prev, pageIndex: 0 }));
        }}
        columnLabels={COLUMN_LABELS}
        columnIcons={COLUMN_ICONS}
        onResetAll={resetAllCriteria}
      >
        {/* Auto Approve Chip */}
        {autoApproveFilter !== "all" && (
          <Badge
            variant="secondary"
            className="shrink-0 gap-1 py-0.5 pl-2 pr-1 text-2xs font-normal"
          >
            <HugeiconsIcon
              icon={ToggleOnIcon}
              className="size-2.5 text-muted-foreground shrink-0"
              data-icon="inline-start"
            />
            <span className="text-muted-foreground">Auto Approve:</span>
            <HugeiconsIcon
              icon={autoApproveFilter === "true" ? CheckmarkCircle02Icon : CancelCircleIcon}
              className="size-2.5 shrink-0"
            />
            <span className="font-medium">
              {autoApproveFilter === "true" ? "Enabled" : "Disabled"}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                setAutoApproveFilter("all");
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className="size-4 rounded-full p-0 text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
              aria-label="Remove auto approve filter"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-2.5" />
            </Button>
          </Badge>
        )}

        {/* Date Range Chip */}
        {dateRange?.from && (
          <Badge
            variant="secondary"
            className="shrink-0 gap-1 py-0.5 pl-2 pr-1 text-2xs font-normal"
          >
            <HugeiconsIcon
              icon={Calendar01Icon}
              className="size-2.5 text-muted-foreground shrink-0"
              data-icon="inline-start"
            />
            <span className="text-muted-foreground">Created:</span>
            <span className="font-medium">
              {dateRange.to
                ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`
                : format(dateRange.from, "LLL dd, y")}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                setDateRange(undefined);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className="size-4 rounded-full p-0 text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
              aria-label="Remove date range filter"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-2.5" />
            </Button>
          </Badge>
        )}
      </DataTableCriteriaBar>

      {/* Reusable Data Table Content */}
      <DataTableContent
        table={table}
        loading={loading}
        error={error}
        onRetry={fetchCenters}
        emptyMessage="No centers found matching the specified filters."
        loadingMessage="Loading centers..."
      />

      {/* Pagination Controls */}
      <DataTablePagination table={table} />
    </div>
  );
}
