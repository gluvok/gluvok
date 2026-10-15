"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableSearchInput } from "@/components/data-table/data-table-search-input";
import {
  DataTableFacetedFilter,
  type FacetedFilterOption,
} from "@/components/data-table/data-table-faceted-filter";
import { DataTableCriteriaBar } from "@/components/data-table/data-table-criteria-bar";
import { DataTableDateRangeChip } from "@/components/data-table/data-table-date-range-chip";
import { DataTableContent } from "@/components/data-table/data-table-content";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { DatePickerWithRange } from "@/components/data-table/date-range-picker";
import { DataTableHydrationCard } from "@/components/data-table/data-table-hydration-card";
import { useDataTable } from "@/components/data-table/use-data-table";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Building01Icon,
  Calendar01Icon,
  Cancel01Icon,
  HashtagIcon,
  HeadsetIcon,
  Image01Icon,
  Layers01Icon,
  TruckIcon,
  UserIcon,
  WeightScale01Icon,
} from "@hugeicons/core-free-icons";
import { columns, type EntriesTableMeta } from "./columns";
import { EntryDetailSheet } from "./entry-detail-sheet";
import { type Entry } from "./types";
import { type Center } from "@/app/centers/types";

const TABLE_ID = "entries";

const COLUMN_LABELS: Record<string, string> = {
  id: "ID",
  vehicle_number: "Vehicle Number",
  weight: "Weight",
  center: "Center",
  customer: "Customer",
  operator: "Operator",
  images: "Photos",
  created_at: "Created At",
};

const COLUMN_ICONS: Record<string, unknown> = {
  id: HashtagIcon,
  vehicle_number: TruckIcon,
  weight: WeightScale01Icon,
  center: Building01Icon,
  customer: UserIcon,
  operator: HeadsetIcon,
  images: Image01Icon,
  created_at: Calendar01Icon,
};

export function EntriesDataTable() {
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [centerFilter, setCenterFilter] = useState<string>("all");
  const [centerOptions, setCenterOptions] = useState<FacetedFilterOption[]>([
    { label: "All Centers", value: "all", icon: Layers01Icon },
  ]);

  useEffect(() => {
    let isMounted = true;
    async function loadCenters() {
      try {
        const res = await axios.get<{ data: Center[] }>("/api/centers?pageSize=100");
        if (isMounted && res.data.data) {
          const fetchedOptions: FacetedFilterOption[] = res.data.data.map((c) => ({
            label: c.name,
            value: String(c.id),
            icon: Building01Icon,
          }));
          setCenterOptions([
            { label: "All Centers", value: "all", icon: Layers01Icon },
            ...fetchedOptions,
          ]);
        }
      } catch {
        // Fallback to static all centers option
      }
    }
    loadCenters();
    return () => {
      isMounted = false;
    };
  }, []);

  const extraParams = useMemo(() => {
    if (centerFilter && centerFilter !== "all") {
      return { center_id: centerFilter };
    }
    return undefined;
  }, [centerFilter]);

  const tableMeta: EntriesTableMeta = useMemo(
    () => ({
      onViewDetails: (entry: Entry) => {
        setSelectedEntry(entry);
        setSheetOpen(true);
      },
    }),
    [],
  );

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
    hasActiveFilters: baseHasActiveFilters,
    resetAllCriteria: baseResetAllCriteria,
    refresh,
  } = useDataTable<Entry>({
    tableId: TABLE_ID,
    columns,
    endpoint: "/api/entries",
    extraParams,
    meta: tableMeta,
  });

  const hasActiveFilters = baseHasActiveFilters || centerFilter !== "all";

  const resetAllCriteria = () => {
    baseResetAllCriteria();
    setCenterFilter("all");
  };

  const activeCenterLabel = useMemo(() => {
    if (centerFilter === "all") return null;
    return (
      centerOptions.find((opt) => opt.value === centerFilter)?.label ?? `Center #${centerFilter}`
    );
  }, [centerFilter, centerOptions]);

  if (!hasHydrated) {
    return <DataTableHydrationCard />;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Primary Toolbar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Filters Group (Left) */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full sm:w-auto">
          {/* Search Input for Vehicle Plate */}
          <DataTableSearchInput
            placeholder="Search vehicle number..."
            value={search}
            onChange={setSearch}
          />

          {/* Center Faceted Filter */}
          <DataTableFacetedFilter
            title="Center"
            options={centerOptions}
            value={centerFilter}
            onValueChange={(val: string) => {
              setCenterFilter(val);
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
        {/* Active Center Filter Chip */}
        {activeCenterLabel && (
          <Badge
            variant="secondary"
            className="flex items-center gap-1.5 py-1 px-2 text-2xs font-normal"
          >
            <span className="text-muted-foreground">Center:</span>
            <span className="font-medium text-foreground">{activeCenterLabel}</span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                setCenterFilter("all");
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className="size-3.5 p-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-2.5" />
              <span className="sr-only">Clear center filter</span>
            </Button>
          </Badge>
        )}

        {/* Active Date Range Chip */}
        <DataTableDateRangeChip
          dateRange={dateRange}
          onRemove={() => {
            setDateRange(undefined);
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
          }}
        />
      </DataTableCriteriaBar>

      {/* Reusable Data Table Content */}
      <DataTableContent
        table={table}
        loading={loading}
        error={error}
        onRetry={refresh}
        emptyMessage="No entries found matching the specified filters."
        loadingMessage="Loading scale entries..."
      />

      {/* Pagination Controls */}
      <DataTablePagination table={table} />

      {/* Slide-out Entry Detail Sheet */}
      <EntryDetailSheet entry={selectedEntry} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
