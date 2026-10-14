"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  useTable,
  type ColumnVisibilityState,
  type PaginationState,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type TableMeta,
  type TableOptions,
  type Updater,
} from "@tanstack/react-table";
import type { DateRange } from "react-day-picker";
import { features, type DataTableFeatures } from "./data-table-features";
import { useDebounce } from "@/hooks/use-debounce";
import { getErrorMessage } from "@/lib/utils";
import {
  DEFAULT_TABLE_ITEM_STATE,
  useDataTableStore,
  useTableHydrated,
} from "@/stores/use-data-table-store";

export interface UseDataTableOptions<TData extends RowData> {
  tableId: string;
  columns: TableOptions<DataTableFeatures, TData>["columns"];
  endpoint?: string;
  extraParams?: Record<string, unknown>;
  fetchData?: (params: Record<string, unknown>) => Promise<{ data: TData[]; totalCount: number }>;
  meta?: TableMeta<DataTableFeatures, TData>;
  defaultSortColumn?: string;
}

export function useDataTable<TData extends RowData>({
  tableId,
  columns,
  endpoint,
  extraParams,
  fetchData,
  meta,
  defaultSortColumn = "id",
}: UseDataTableOptions<TData>) {
  const hasHydrated = useTableHydrated();
  const store = useDataTableStore();
  const tableState = store.tables[tableId] ?? DEFAULT_TABLE_ITEM_STATE;

  const [data, setData] = useState<TData[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const search = tableState.search;
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

  // Store action dispatchers
  const setSearch = useCallback(
    (val: string) => store.setTableSearch(tableId, val),
    [store, tableId],
  );
  const setFilter = useCallback(
    (key: string, val: string) => store.setTableFilter(tableId, key, val),
    [store, tableId],
  );
  const setDateRange = useCallback(
    (range: DateRange | undefined) =>
      store.setTableDateRange(
        tableId,
        range ? { from: range.from?.toISOString(), to: range.to?.toISOString() } : undefined,
      ),
    [store, tableId],
  );
  const setSorting = useCallback(
    (updater: Updater<SortingState>) => store.setTableSorting(tableId, updater),
    [store, tableId],
  );
  const removeSort = useCallback(
    (columnId: string) => store.removeTableSort(tableId, columnId),
    [store, tableId],
  );
  const resetSorting = useCallback(() => store.resetTableSorting(tableId), [store, tableId]);
  const setPagination = useCallback(
    (updater: Updater<PaginationState>) => store.setTablePagination(tableId, updater),
    [store, tableId],
  );
  const setColumnVisibility = useCallback(
    (updater: Updater<ColumnVisibilityState>) => store.setTableColumnVisibility(tableId, updater),
    [store, tableId],
  );
  const resetAllFilters = useCallback(() => store.resetTableFilters(tableId), [store, tableId]);
  const resetAllCriteria = useCallback(() => {
    store.resetTableFilters(tableId);
    store.resetTableSorting(tableId);
  }, [store, tableId]);

  // Serialized extraParams and filters string for dependency stability
  const extraParamsKey = useMemo(() => JSON.stringify(extraParams ?? {}), [extraParams]);
  const filtersKey = useMemo(() => JSON.stringify(tableState.filters ?? {}), [tableState.filters]);

  // Data fetching routine
  const fetchTableData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const queryParams: Record<string, unknown> = {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      ...(sorting.length > 0 && {
        sort: sorting.map((s) => `${s.id}.${s.desc ? "desc" : "asc"}`).join(","),
      }),
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(dateRange?.from && { from: dateRange.from.toISOString() }),
      ...(dateRange?.to && { to: dateRange.to.toISOString() }),
      ...tableState.filters,
      ...extraParams,
    };

    try {
      if (fetchData) {
        const res = await fetchData(queryParams);
        setData(res.data ?? []);
        setTotalCount(res.totalCount ?? 0);
      } else if (endpoint) {
        const res = await axios.get<{ data: TData[]; totalCount: number }>(endpoint, {
          params: queryParams,
        });
        setData(res.data.data ?? []);
        setTotalCount(res.data.totalCount ?? 0);
      }
    } catch (err) {
      setError(getErrorMessage(err, "An unexpected error occurred."));
    } finally {
      setLoading(false);
    }
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    sorting,
    debouncedSearch,
    dateRange,
    endpoint,
    fetchData,
    filtersKey,
    extraParamsKey,
  ]);

  useEffect(() => {
    if (!hasHydrated) return;
    fetchTableData();
  }, [hasHydrated, fetchTableData]);

  // TanStack table instance
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
    meta,
    state: {
      pagination,
      sorting,
      columnVisibility,
      rowSelection,
    },
  });

  const isDefaultSort =
    sorting.length === 1 && sorting[0].id === defaultSortColumn && sorting[0].desc === true;
  const hasActiveSorts = !isDefaultSort && sorting.length > 0;
  const hasActiveFilters = Boolean(
    dateRange?.from ||
    Object.entries(tableState.filters).some(([k, v]) => {
      if (extraParams && k in extraParams) return false;
      return v !== "all" && v !== "";
    }),
  );

  const selectedRows = useMemo(() => {
    return table.getSelectedRowModel().rows.map((r) => r.original);
  }, [table, rowSelection]);
  const selectedCount = selectedRows.length;

  return {
    table,
    data,
    totalCount,
    loading,
    error,
    hasHydrated,
    search,
    setSearch,
    debouncedSearch,
    dateRange,
    setDateRange,
    sorting,
    setSorting,
    removeSort,
    resetSorting,
    pagination,
    setPagination,
    columnVisibility,
    setColumnVisibility,
    rowSelection,
    setRowSelection,
    selectedRows,
    selectedCount,
    hasActiveSorts,
    hasActiveFilters,
    resetAllCriteria,
    resetAllFilters,
    setFilter,
    refresh: fetchTableData,
    tableState,
  };
}
