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
  Clock01Icon,
  HashtagIcon,
  Image01Icon,
  SecurityCheckIcon,
  TruckIcon,
  UserIcon,
  WeightScale01Icon,
} from "@hugeicons/core-free-icons";
import { appIcons } from "@/lib/icons";
import { columns, type EntriesTableMeta } from "./columns";
import { EntryDetailSheet } from "./entry-detail-sheet";
import { type Entry } from "./types";
import { type Center } from "@/app/centers/types";
import { type User } from "@/app/users/types";

const TABLE_ID = "entries";

const COLUMN_LABELS: Record<string, string> = {
  id: "ID",
  vehicle_number: "Vehicle Number",
  weight: "Weight",
  source: "Source",
  center: "Center",
  customer: "Customer",
  created_by: "Created by",
  images: "Photos",
  created_at: "Created At",
  updated_at: "Updated At",
};

const COLUMN_ICONS: Record<string, unknown> = {
  id: HashtagIcon,
  vehicle_number: TruckIcon,
  weight: WeightScale01Icon,
  source: SecurityCheckIcon,
  center: Building01Icon,
  customer: UserIcon,
  created_by: UserIcon,
  images: Image01Icon,
  created_at: Calendar01Icon,
  updated_at: Clock01Icon,
};

const SOURCE_OPTIONS: FacetedFilterOption[] = [
  { label: "All Sources", value: "all", icon: appIcons.allFilter },
  { label: "Hardware", value: "hardware", icon: SecurityCheckIcon },
  { label: "Manual", value: "manual", icon: UserIcon },
];

export function EntriesDataTable() {
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [centerOptions, setCenterOptions] = useState<FacetedFilterOption[]>([
    { label: "All Centers", value: "all", icon: appIcons.centers },
  ]);
  const [customerOptions, setCustomerOptions] = useState<FacetedFilterOption[]>([
    { label: "All Customers", value: "all", icon: appIcons.customers },
  ]);
  const [creatorOptions, setCreatorOptions] = useState<FacetedFilterOption[]>([
    { label: "All Creators", value: "all", icon: appIcons.users },
  ]);

  useEffect(() => {
    let isMounted = true;
    async function loadFilterData() {
      try {
        const [centersRes, customersRes, creatorsRes] = await Promise.all([
          axios.get<{ data: Center[] }>("/api/centers?pageSize=100"),
          axios.get<{ data: User[] }>("/api/users?role=customer&pageSize=100"),
          axios.get<{ data: User[] }>("/api/users?pageSize=100"),
        ]);

        if (isMounted) {
          if (centersRes.data.data) {
            setCenterOptions([
              { label: "All Centers", value: "all", icon: appIcons.centers },
              ...centersRes.data.data.map((c) => ({
                label: `#${c.id} ${c.name}`,
                value: String(c.id),
              })),
            ]);
          }
          if (customersRes.data.data) {
            setCustomerOptions([
              { label: "All Customers", value: "all", icon: appIcons.customers },
              ...customersRes.data.data.map((u) => ({
                label: `#${u.id} ${u.name}`,
                value: String(u.id),
              })),
            ]);
          }
          if (creatorsRes.data.data) {
            setCreatorOptions([
              { label: "All Creators", value: "all", icon: appIcons.users },
              ...creatorsRes.data.data.map((u) => ({
                label: `#${u.id} ${u.name}`,
                value: String(u.id),
              })),
            ]);
          }
        }
      } catch {
        // Fallback to static all options
      }
    }
    loadFilterData();
    return () => {
      isMounted = false;
    };
  }, []);

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
    hasActiveSorts,
    hasActiveFilters,
    resetAllCriteria,
    setFilter,
    refresh,
    tableState,
  } = useDataTable<Entry>({
    tableId: TABLE_ID,
    columns,
    endpoint: "/api/entries",
    meta: tableMeta,
  });

  const centerFilter = tableState.filters?.center_id ?? "all";
  const customerFilter = tableState.filters?.customer_id ?? "all";
  const creatorFilter = tableState.filters?.created_by ?? "all";
  const sourceFilter = tableState.filters?.source ?? "all";

  const activeCenterLabel = useMemo(() => {
    if (centerFilter === "all") return null;
    return (
      centerOptions.find((opt) => opt.value === centerFilter)?.label ?? `Center #${centerFilter}`
    );
  }, [centerFilter, centerOptions]);

  const activeCustomerLabel = useMemo(() => {
    if (customerFilter === "all") return null;
    return (
      customerOptions.find((opt) => opt.value === customerFilter)?.label ??
      `Customer #${customerFilter}`
    );
  }, [customerFilter, customerOptions]);

  const activeCreatorLabel = useMemo(() => {
    if (creatorFilter === "all") return null;
    return (
      creatorOptions.find((opt) => opt.value === creatorFilter)?.label ??
      `Creator #${creatorFilter}`
    );
  }, [creatorFilter, creatorOptions]);

  const activeSourceLabel = useMemo(() => {
    if (sourceFilter === "all") return null;
    return SOURCE_OPTIONS.find((opt) => opt.value === sourceFilter)?.label ?? sourceFilter;
  }, [sourceFilter]);

  if (!hasHydrated) {
    return <DataTableHydrationCard />;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Primary Toolbar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Filters Group (Left) */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search Input for Vehicle Plate & Weight */}
          <DataTableSearchInput
            placeholder="Search entries..."
            value={search}
            onChange={setSearch}
          />

          {/* Center Faceted Filter */}
          <DataTableFacetedFilter
            title="Center"
            options={centerOptions}
            value={centerFilter}
            onValueChange={(val: string) => setFilter("center_id", val)}
          />

          {/* Customer Faceted Filter */}
          <DataTableFacetedFilter
            title="Customer"
            options={customerOptions}
            value={customerFilter}
            onValueChange={(val: string) => setFilter("customer_id", val)}
          />

          {/* Created by Faceted Filter */}
          <DataTableFacetedFilter
            title="Created by"
            options={creatorOptions}
            value={creatorFilter}
            onValueChange={(val: string) => setFilter("created_by", val)}
          />

          {/* Source Faceted Filter */}
          <DataTableFacetedFilter
            title="Source"
            options={SOURCE_OPTIONS}
            value={sourceFilter}
            onValueChange={(val: string) => setFilter("source", val)}
          />
        </div>

        {/* Action Controls Group (Right) */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          <DatePickerWithRange
            date={dateRange}
            onDateChange={(range) => setDateRange(range)}
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
        onSortingChange={(updater) => setSorting(updater)}
        onRemoveSort={(columnId) => removeSort(columnId)}
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
              onClick={() => setFilter("center_id", "all")}
              className="size-3.5 p-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-2.5" />
              <span className="sr-only">Clear center filter</span>
            </Button>
          </Badge>
        )}

        {/* Active Customer Filter Chip */}
        {activeCustomerLabel && (
          <Badge
            variant="secondary"
            className="flex items-center gap-1.5 py-1 px-2 text-2xs font-normal"
          >
            <span className="text-muted-foreground">Customer:</span>
            <span className="font-medium text-foreground">{activeCustomerLabel}</span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setFilter("customer_id", "all")}
              className="size-3.5 p-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-2.5" />
              <span className="sr-only">Clear customer filter</span>
            </Button>
          </Badge>
        )}

        {/* Active Created by Filter Chip */}
        {activeCreatorLabel && (
          <Badge
            variant="secondary"
            className="flex items-center gap-1.5 py-1 px-2 text-2xs font-normal"
          >
            <span className="text-muted-foreground">Created by:</span>
            <span className="font-medium text-foreground">{activeCreatorLabel}</span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setFilter("created_by", "all")}
              className="size-3.5 p-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-2.5" />
              <span className="sr-only">Clear creator filter</span>
            </Button>
          </Badge>
        )}

        {/* Active Source Filter Chip */}
        {activeSourceLabel && (
          <Badge
            variant="secondary"
            className="flex items-center gap-1.5 py-1 px-2 text-2xs font-normal"
          >
            <span className="text-muted-foreground">Source:</span>
            <span className="font-medium text-foreground">{activeSourceLabel}</span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setFilter("source", "all")}
              className="size-3.5 p-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-2.5" />
              <span className="sr-only">Clear source filter</span>
            </Button>
          </Badge>
        )}

        {/* Active Date Range Chip */}
        <DataTableDateRangeChip dateRange={dateRange} onRemove={() => setDateRange(undefined)} />
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
