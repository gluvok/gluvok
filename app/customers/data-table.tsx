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
import { DataTableCriteriaBar } from "@/components/data-table/data-table-criteria-bar";
import { DataTableContent } from "@/components/data-table/data-table-content";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { DatePickerWithRange } from "@/components/data-table/date-range-picker";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar01Icon,
  Cancel01Icon,
  Clock01Icon,
  Delete02Icon,
  HashtagIcon,
  TextFontIcon,
  UserAdd01Icon,
  UserGroupIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { columns, type CustomersTableMeta } from "./columns";
import { features } from "@/components/data-table/data-table-features";
import { useDebounce } from "@/hooks/use-debounce";
import {
  DEFAULT_TABLE_ITEM_STATE,
  useDataTableStore,
  useTableHydrated,
} from "@/stores/use-data-table-store";
import { type Customer, type CustomersApiResponse } from "./types";
import { CustomerFormDialog } from "./customer-form-dialog";
import { CustomerDeleteDialog } from "./customer-delete-dialog";

const TABLE_ID = "customers";

const COLUMN_LABELS: Record<string, string> = {
  id: "ID",
  name: "Full Name",
  father_name: "Father's Name",
  username: "Username",
  created_at: "Created At",
  updated_at: "Updated At",
};

const COLUMN_ICONS: Record<string, unknown> = {
  id: HashtagIcon,
  name: UserIcon,
  father_name: UserGroupIcon,
  username: TextFontIcon,
  created_at: Calendar01Icon,
  updated_at: Clock01Icon,
};

export function CustomersDataTable() {
  const hasHydrated = useTableHydrated();
  const store = useDataTableStore();
  const tableState = store.tables[TABLE_ID] ?? DEFAULT_TABLE_ITEM_STATE;

  const [data, setData] = useState<Customer[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState<boolean>(false);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState<Customer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [customersToDelete, setCustomersToDelete] = useState<Customer[]>([]);

  // Read persisted state for 'customers' table from store
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

  // Actions updating persisted store
  const setSearch = (val: string) => store.setTableSearch(TABLE_ID, val);
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

  // Fetch customers from unified /api/users endpoint with role=customer
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get<CustomersApiResponse>("/api/users", {
        params: {
          role: "customer",
          page: pagination.pageIndex + 1,
          pageSize: pagination.pageSize,
          ...(sorting.length > 0 && {
            sort: sorting.map((s) => `${s.id}.${s.desc ? "desc" : "asc"}`).join(","),
          }),
          ...(debouncedSearch && { search: debouncedSearch }),
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
  }, [pagination.pageIndex, pagination.pageSize, sorting, debouncedSearch, dateRange]);

  useEffect(() => {
    if (!hasHydrated) return;
    fetchCustomers();
  }, [hasHydrated, fetchCustomers]);

  // Handle edit customer trigger from row action
  const handleEditCustomer = useCallback((customer: Customer) => {
    setSelectedCustomerForEdit(customer);
    setFormDialogOpen(true);
  }, []);

  // Handle single delete customer trigger from row action
  const handleDeleteCustomer = useCallback((customer: Customer) => {
    setCustomersToDelete([customer]);
    setDeleteDialogOpen(true);
  }, []);

  // Table meta callbacks passed down to row actions
  const tableMeta = useMemo<CustomersTableMeta>(
    () => ({
      onEditCustomer: handleEditCustomer,
      onDeleteCustomer: handleDeleteCustomer,
    }),
    [handleEditCustomer, handleDeleteCustomer],
  );

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
    meta: tableMeta,
    state: {
      pagination,
      sorting,
      columnVisibility,
      rowSelection,
    },
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

  const handleAddCustomer = () => {
    setSelectedCustomerForEdit(null);
    setFormDialogOpen(true);
  };

  const handleBatchDelete = () => {
    if (selectedCount === 0) return;
    const targets = selectedRows.map((r) => r.original);
    setCustomersToDelete(targets);
    setDeleteDialogOpen(true);
  };

  const handleMutationSuccess = () => {
    setRowSelection({});
    fetchCustomers();
  };

  const isDefaultSort = sorting.length === 1 && sorting[0].id === "id" && sorting[0].desc === true;
  const hasActiveSorts = !isDefaultSort && sorting.length > 0;
  const hasActiveFilters = Boolean(dateRange?.from);

  // Hydration guard
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
            placeholder="Search by name, father's name, or username..."
            value={search}
            onChange={setSearch}
          />
        </div>

        {/* Action Controls Group (Right) */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {/* Creation Date Range Picker */}
          <DatePickerWithRange
            date={dateRange}
            onDateChange={(range) => {
              setDateRange(range);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            className="flex-1 sm:flex-initial"
          />

          {/* Batch Delete Button */}
          {selectedCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBatchDelete}
              className="h-8 gap-1.5 text-xs animate-in fade-in-0 duration-150"
            >
              <HugeiconsIcon icon={Delete02Icon} className="size-3.5" data-icon="inline-start" />
              <span>Delete ({selectedCount})</span>
            </Button>
          )}

          {/* Add Customer Button */}
          <Button size="sm" onClick={handleAddCustomer} className="h-8 gap-1.5 text-xs">
            <HugeiconsIcon icon={UserAdd01Icon} className="size-3.5" data-icon="inline-start" />
            <span>Add Customer</span>
          </Button>

          {/* Column Visibility Toggle */}
          <DataTableViewOptions table={table} />
        </div>
      </div>

      {/* Criteria Bar: Dynamic active filter and sort chips */}
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
              {format(dateRange.from, "MMM dd, yyyy")}
              {dateRange.to ? ` - ${format(dateRange.to, "MMM dd, yyyy")}` : ""}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                setDateRange(undefined);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className="size-3.5 p-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-2.5" />
              <span className="sr-only">Clear date range filter</span>
            </Button>
          </Badge>
        )}
      </DataTableCriteriaBar>

      {/* Table Content with integrated server loading, empty, and error states */}
      <DataTableContent
        table={table}
        loading={loading}
        error={error}
        onRetry={fetchCustomers}
        emptyMessage="No customers found matching the specified filters."
        loadingMessage="Loading customers..."
      />

      {/* Pagination Footer */}
      <DataTablePagination table={table} />

      {/* Add / Edit Customer Dialog */}
      <CustomerFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        customer={selectedCustomerForEdit}
        onSuccess={handleMutationSuccess}
      />

      {/* Customer Deletion Confirmation Dialog */}
      <CustomerDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        customers={customersToDelete}
        onSuccess={handleMutationSuccess}
      />
    </div>
  );
}
