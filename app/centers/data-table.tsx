"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableSearchInput } from "@/components/data-table/data-table-search-input";
import { DataTableCriteriaBar } from "@/components/data-table/data-table-criteria-bar";
import { DataTableContent } from "@/components/data-table/data-table-content";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { DatePickerWithRange } from "@/components/data-table/date-range-picker";
import { DataTableHydrationCard } from "@/components/data-table/data-table-hydration-card";
import { useDataTable } from "@/components/data-table/use-data-table";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar01Icon,
  Cancel01Icon,
  Clock01Icon,
  HashtagIcon,
  TextFontIcon,
} from "@hugeicons/core-free-icons";
import { columns } from "./columns";
import { type Center } from "./types";

const TABLE_ID = "centers";

const COLUMN_LABELS: Record<string, string> = {
  id: "ID",
  name: "Name",
  created_at: "Created At",
  updated_at: "Updated At",
};

const COLUMN_ICONS: Record<string, unknown> = {
  id: HashtagIcon,
  name: TextFontIcon,
  created_at: Calendar01Icon,
  updated_at: Clock01Icon,
};

export function CentersDataTable() {
  const {
    table,
    loading,
    error,
    hasHydrated,
    search,
    setSearch,
    dateRange,
    setDateRange,
    sorting,
    setSorting,
    removeSort,
    setPagination,
    hasActiveSorts,
    hasActiveFilters,
    resetAllCriteria,
    refresh,
  } = useDataTable<Center>({
    tableId: TABLE_ID,
    columns,
    endpoint: "/api/centers",
  });

  if (!hasHydrated) {
    return <DataTableHydrationCard />;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Primary Toolbar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Filters Group (Left) */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full sm:w-auto">
          {/* Search Input with Clear Button */}
          <DataTableSearchInput
            placeholder="Search centers..."
            value={search}
            onChange={setSearch}
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
        onRetry={refresh}
        emptyMessage="No centers found matching the specified filters."
        loadingMessage="Loading centers..."
      />

      {/* Pagination Controls */}
      <DataTablePagination table={table} />
    </div>
  );
}
