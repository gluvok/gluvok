"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  DataTableContent,
  DataTablePagination,
  DataTableHydrationCard,
  useDataTable,
  type FacetedFilterOption,
} from "@/components/data-table";
import {
  Building01Icon,
  Calendar01Icon,
  Clock01Icon,
  CpuIcon,
  HashtagIcon,
  Image01Icon,
  TransmissionIcon,
  TruckIcon,
  UserGroupIcon,
  UserIcon,
  WeightScale01Icon,
} from "@hugeicons/core-free-icons";
import { appIcons } from "@/lib/icons";
import { getErrorMessage } from "@/lib/utils";
import { useDataTableStore } from "@/stores/use-data-table-store";
import type { TableItemState } from "@/lib/table-cookie";
import {
  EntryPhotosDialog,
  EntriesToolbar,
  EntriesCriteriaBar,
  EntriesErrorState,
  type EntriesFilterConfig,
} from "@/components/entries";
import { columns } from "./columns";
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
  source: TransmissionIcon,
  center: Building01Icon,
  customer: UserGroupIcon,
  created_by: UserIcon,
  images: Image01Icon,
  created_at: Calendar01Icon,
  updated_at: Clock01Icon,
};

const SOURCE_OPTIONS: FacetedFilterOption[] = [
  { label: "All Sources", value: "all", icon: TransmissionIcon },
  { label: "Hardware", value: "hardware", icon: CpuIcon },
  { label: "Manual", value: "manual", icon: UserIcon },
];

function formatCenterOptions(centers: Center[]): FacetedFilterOption[] {
  return [
    { label: "All Centers", value: "all", icon: appIcons.centers },
    ...centers.map((c) => ({
      idPrefix: `#${c.id}`,
      label: c.name,
      value: String(c.id),
    })),
  ];
}

function formatCustomerOptions(customers: User[]): FacetedFilterOption[] {
  return [
    { label: "All Customers", value: "all", icon: appIcons.customers },
    ...customers.map((u) => ({
      idPrefix: `#${u.id}`,
      label: u.name,
      value: String(u.id),
    })),
  ];
}

function formatCreatorOptions(creators: User[]): FacetedFilterOption[] {
  return [
    { label: "All Creators", value: "all", icon: appIcons.users },
    ...creators.map((u) => ({
      idPrefix: `#${u.id}`,
      label: u.name,
      value: String(u.id),
      icon: u.role === "hardware" ? CpuIcon : UserIcon,
    })),
  ];
}

async function fetchFilterOptions() {
  const [centersRes, customersRes, creatorsRes] = await Promise.all([
    axios.get<{ data: Center[] }>("/api/centers?all=true&sort=name.asc"),
    axios.get<{ data: User[] }>("/api/users?role=customer&all=true&sort=name.asc"),
    axios.get<{ data: User[] }>("/api/users?all=true&includeHardware=true&sort=name.asc"),
  ]);
  return {
    centers: centersRes.data.data ?? [],
    customers: customersRes.data.data ?? [],
    creators: creatorsRes.data.data ?? [],
  };
}

function validateAndSanitizeFilters(
  currentFilters: Record<string, string>,
  centers: Center[],
  customers: User[],
  creators: User[],
  onReset: (key: string) => void,
): { sanitizedFilters: Record<string, string>; needsFallback: boolean } {
  let needsFallback = false;
  const sanitizedFilters = { ...currentFilters };
  const dynamicEntityChecks: Array<{ key: string; items: Array<{ id: number | string }> }> = [
    { key: "center_id", items: centers },
    { key: "customer_id", items: customers },
    { key: "created_by", items: creators },
  ];

  for (const { key, items } of dynamicEntityChecks) {
    const activeVal = sanitizedFilters[key];
    if (activeVal && activeVal !== "all" && !items.some((item) => String(item.id) === activeVal)) {
      sanitizedFilters[key] = "all";
      onReset(key);
      needsFallback = true;
    }
  }

  return { sanitizedFilters, needsFallback };
}

function buildEntriesQueryParams(
  tableState: TableItemState,
  pageOverride?: number,
  filtersOverride?: Record<string, string>,
): Record<string, unknown> {
  const pagination = tableState.pagination;
  const sorting = tableState.sorting;
  const search = tableState.search;
  const fromIso = tableState.dateRange?.from;
  const toIso = tableState.dateRange?.to;
  const filters = filtersOverride ?? tableState.filters;

  return {
    page: pageOverride ?? pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    ...(sorting.length > 0 && {
      sort: sorting.map((s) => `${s.id}.${s.desc ? "desc" : "asc"}`).join(","),
    }),
    ...(search && { search }),
    ...(fromIso && { from: fromIso }),
    ...(toIso && { to: toIso }),
    ...filters,
  };
}

export function EntriesDataTable() {
  const [centerOptions, setCenterOptions] = useState<FacetedFilterOption[]>([
    { label: "All Centers", value: "all", icon: appIcons.centers },
  ]);
  const [customerOptions, setCustomerOptions] = useState<FacetedFilterOption[]>([
    { label: "All Customers", value: "all", icon: appIcons.customers },
  ]);
  const [creatorOptions, setCreatorOptions] = useState<FacetedFilterOption[]>([
    { label: "All Creators", value: "all", icon: appIcons.users },
  ]);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<
    { data: Entry[]; totalCount: number } | undefined
  >();

  const activeLoadIdRef = useRef<number>(0);
  const [selectedEntryForPhotos, setSelectedEntryForPhotos] = useState<Entry | null>(null);
  const [photosDialogOpen, setPhotosDialogOpen] = useState<boolean>(false);

  const handleViewPhotos = useCallback((entry: Entry) => {
    setSelectedEntryForPhotos(entry);
    setPhotosDialogOpen(true);
  }, []);

  const tableMeta = useMemo(
    () => ({
      onViewPhotos: handleViewPhotos,
    }),
    [handleViewPhotos],
  );

  const fetchEntries = useCallback(async (queryParams: Record<string, unknown>) => {
    const currentTableState = useDataTableStore.getState().getTableState(TABLE_ID);
    const centerFilter = currentTableState.filters?.center_id ?? "all";
    const customerFilter = currentTableState.filters?.customer_id ?? "all";
    const creatorFilter = currentTableState.filters?.created_by ?? "all";
    const hasActiveDynamicFilter =
      centerFilter !== "all" || customerFilter !== "all" || creatorFilter !== "all";

    if (hasActiveDynamicFilter) {
      const [optionsResult, entriesRes] = await Promise.all([
        fetchFilterOptions(),
        axios.get<{ data: Entry[]; totalCount: number }>("/api/entries", { params: queryParams }),
      ]);
      const { centers, customers, creators } = optionsResult;
      let finalEntries = entriesRes.data;

      const { sanitizedFilters, needsFallback } = validateAndSanitizeFilters(
        currentTableState.filters ?? {},
        centers,
        customers,
        creators,
        (key) => useDataTableStore.getState().setTableFilter(TABLE_ID, key, "all"),
      );

      if (needsFallback) {
        useDataTableStore.getState().setTablePagination(TABLE_ID, (prev) => ({
          ...prev,
          pageIndex: 0,
        }));
        const fallbackParams = {
          ...queryParams,
          page: 1,
          ...sanitizedFilters,
        };
        const refetchRes = await axios.get<{ data: Entry[]; totalCount: number }>("/api/entries", {
          params: fallbackParams,
        });
        finalEntries = refetchRes.data;
      }

      setCenterOptions(formatCenterOptions(centers));
      setCustomerOptions(formatCustomerOptions(customers));
      setCreatorOptions(formatCreatorOptions(creators));

      return finalEntries;
    }

    // Fast path: No dynamic filter active on page switch, fetch only entries
    const res = await axios.get<{ data: Entry[]; totalCount: number }>("/api/entries", {
      params: queryParams,
    });
    return res.data;
  }, []);

  const loadInitialData = useCallback(async () => {
    const currentLoadId = ++activeLoadIdRef.current;
    setIsInitialLoading(true);
    setInitialError(null);
    try {
      const currentTableState = useDataTableStore.getState().getTableState(TABLE_ID);
      const initialQueryParams = buildEntriesQueryParams(currentTableState);

      const [optionsResult, entriesRes] = await Promise.all([
        fetchFilterOptions(),
        axios.get<{ data: Entry[]; totalCount: number }>("/api/entries", {
          params: initialQueryParams,
        }),
      ]);

      if (currentLoadId !== activeLoadIdRef.current) return;

      const { centers, customers, creators } = optionsResult;
      let finalEntries = entriesRes.data;

      const { sanitizedFilters, needsFallback } = validateAndSanitizeFilters(
        currentTableState.filters ?? {},
        centers,
        customers,
        creators,
        (key) => useDataTableStore.getState().setTableFilter(TABLE_ID, key, "all"),
      );

      if (needsFallback) {
        useDataTableStore.getState().setTablePagination(TABLE_ID, (prev) => ({
          ...prev,
          pageIndex: 0,
        }));
        const fallbackParams = buildEntriesQueryParams(currentTableState, 1, sanitizedFilters);
        const refetchRes = await axios.get<{ data: Entry[]; totalCount: number }>("/api/entries", {
          params: fallbackParams,
        });
        if (currentLoadId !== activeLoadIdRef.current) return;
        finalEntries = refetchRes.data;
      }

      setCenterOptions(formatCenterOptions(centers));
      setCustomerOptions(formatCustomerOptions(customers));
      setCreatorOptions(formatCreatorOptions(creators));
      setInitialData(finalEntries);
      setIsInitialLoading(false);
    } catch (err) {
      if (currentLoadId === activeLoadIdRef.current) {
        setInitialError(getErrorMessage(err, "Failed to load entries."));
        setIsInitialLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const {
    table,
    loading,
    error,
    search,
    setSearch,
    clearSearch,
    dateRange,
    setDateRange,
    sorting,
    setSorting,
    removeSort,
    hasActiveSorts,
    hasActiveFilters,
    resetAllCriteria,
    resetAllFilters,
    resetSorting,
    setFilter,
    refresh,
    tableState,
  } = useDataTable<Entry>({
    tableId: TABLE_ID,
    columns,
    fetchData: fetchEntries,
    meta: tableMeta,
    enabled: !isInitialLoading && !!initialData,
    initialData,
  });

  const filterConfigs = useMemo<EntriesFilterConfig[]>(
    () => [
      {
        key: "center_id",
        title: "Center",
        options: centerOptions,
        variant: "stone",
        categoryIcon: appIcons.centers,
      },
      {
        key: "customer_id",
        title: "Customer",
        options: customerOptions,
        variant: "emerald",
        categoryIcon: appIcons.customers,
      },
      {
        key: "created_by",
        title: "Created by",
        options: creatorOptions,
        variant: "primary",
        categoryIcon: UserIcon,
      },
      {
        key: "source",
        title: "Source",
        options: SOURCE_OPTIONS,
        variant: "stone",
        categoryIcon: TransmissionIcon,
      },
    ],
    [centerOptions, customerOptions, creatorOptions],
  );

  if (isInitialLoading || !initialData) {
    return <DataTableHydrationCard />;
  }

  if (initialError) {
    return <EntriesErrorState error={initialError} onRetry={loadInitialData} />;
  }

  return (
    <div className="flex flex-1 flex-col gap-2 min-w-0 min-h-0 h-full overflow-hidden">
      {/* Primary Toolbar - 2-Tier Layout */}
      <EntriesToolbar
        table={table}
        search={search}
        onSearchChange={setSearch}
        onSearchClear={clearSearch}
        dateRange={dateRange}
        onDateRangeChange={(range) => setDateRange(range)}
        filterConfigs={filterConfigs}
        filters={tableState.filters}
        onFilterChange={(key, val) => setFilter(key, val)}
      />

      {/* Active Criteria Bar (Badges + Drag-and-Drop Sort Priority Chips) */}
      <EntriesCriteriaBar
        hasActiveFilters={hasActiveFilters}
        hasActiveSorts={hasActiveSorts}
        sorting={sorting}
        onSortingChange={(updater) => setSorting(updater)}
        onRemoveSort={(columnId) => removeSort(columnId)}
        columnLabels={COLUMN_LABELS}
        columnIcons={COLUMN_ICONS}
        onResetFilters={resetAllFilters}
        onResetSorts={resetSorting}
        onResetAll={resetAllCriteria}
        filterConfigs={filterConfigs}
        filters={tableState.filters}
        onFilterChange={(key, val) => setFilter(key, val)}
        dateRange={dateRange}
        onDateRangeChange={(range) => setDateRange(range)}
      />

      {/* Reusable Data Table Content */}
      <DataTableContent
        table={table}
        loading={loading}
        error={error}
        onRetry={refresh}
        emptyMessage="No entries found matching the specified filters."
      />

      {/* Pagination Controls */}
      <div className="shrink-0">
        <DataTablePagination table={table} loading={loading} error={error} />
      </div>

      {/* Photo Viewer Carousel Dialog */}
      <EntryPhotosDialog
        entry={selectedEntryForPhotos}
        open={photosDialogOpen}
        onOpenChange={setPhotosDialogOpen}
      />
    </div>
  );
}
