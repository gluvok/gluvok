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
  Clock01Icon,
  Delete02Icon,
  HashtagIcon,
  SecurityCheckIcon,
  TextFontIcon,
  UserAdd01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { getColumns, type UsersTableMeta } from "./columns";
import { features } from "@/components/data-table/data-table-features";
import { useDebounce } from "@/hooks/use-debounce";
import {
  DEFAULT_TABLE_ITEM_STATE,
  useDataTableStore,
  useTableHydrated,
} from "@/stores/use-data-table-store";
import { type User, type UsersApiResponse } from "./types";
import { UserFormDialog } from "./user-form-dialog";
import { UserDeleteDialog } from "./user-delete-dialog";

const ROLE_OPTIONS: FacetedFilterOption[] = [
  { label: "All Roles", value: "all", icon: SecurityCheckIcon },
  { label: "Admin", value: "admin" },
  { label: "Manager", value: "manager" },
  { label: "Operator", value: "operator" },
  { label: "Base User", value: "base" },
  { label: "Hardware", value: "hardware" },
];

const COLUMN_LABELS: Record<string, string> = {
  id: "ID",
  username: "Username",
  name: "Full Name",
  role: "Role",
  created_at: "Created At",
  updated_at: "Updated At",
};

const COLUMN_ICONS: Record<string, unknown> = {
  id: HashtagIcon,
  username: TextFontIcon,
  name: UserIcon,
  role: SecurityCheckIcon,
  created_at: Calendar01Icon,
  updated_at: Clock01Icon,
};

interface UsersDataTableProps {
  roleScope: "staff" | "customer";
}

export function UsersDataTable({ roleScope }: UsersDataTableProps) {
  const isCustomer = roleScope === "customer";
  const tableId = isCustomer ? "customers" : "users";
  const entityLabel = isCustomer ? "Customer" : "User";

  const hasHydrated = useTableHydrated();
  const store = useDataTableStore();
  const tableState = store.tables[tableId] ?? DEFAULT_TABLE_ITEM_STATE;

  const [data, setData] = useState<User[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState<boolean>(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [usersToDelete, setUsersToDelete] = useState<User[]>([]);

  // Read persisted state from store
  const search = tableState.search;
  const roleFilter = tableState.filters["role"] ?? "all";
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
  const setSearch = (val: string) => store.setTableSearch(tableId, val);
  const setRoleFilter = (val: string) => store.setTableFilter(tableId, "role", val);
  const setDateRange = (range: DateRange | undefined) =>
    store.setTableDateRange(
      tableId,
      range ? { from: range.from?.toISOString(), to: range.to?.toISOString() } : undefined,
    );
  const setSorting = (updater: Updater<SortingState>) => store.setTableSorting(tableId, updater);
  const removeSort = (columnId: string) => store.removeTableSort(tableId, columnId);
  const resetSorting = () => store.resetTableSorting(tableId);
  const setPagination = (updater: Updater<PaginationState>) =>
    store.setTablePagination(tableId, updater);
  const setColumnVisibility = (updater: Updater<ColumnVisibilityState>) =>
    store.setTableColumnVisibility(tableId, updater);
  const resetAllFilters = () => store.resetTableFilters(tableId);
  const resetAllCriteria = () => {
    resetAllFilters();
    resetSorting();
  };

  const columns = useMemo(
    () => getColumns({ showRole: !isCustomer, entityLabel }),
    [isCustomer, entityLabel],
  );

  // Fetch users via axios with multi-column sorting and filtering
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get<UsersApiResponse>("/api/users", {
        params: {
          page: pagination.pageIndex + 1,
          pageSize: pagination.pageSize,
          ...(sorting.length > 0 && {
            sort: sorting.map((s) => `${s.id}.${s.desc ? "desc" : "asc"}`).join(","),
          }),
          ...(debouncedSearch && { search: debouncedSearch }),
          ...(isCustomer ? { role: "customer" } : roleFilter !== "all" ? { role: roleFilter } : {}),
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
    isCustomer,
    roleFilter,
    dateRange,
  ]);

  useEffect(() => {
    if (!hasHydrated) return;
    fetchUsers();
  }, [hasHydrated, fetchUsers]);

  // Handle edit user trigger from row action
  const handleEditUser = useCallback((user: User) => {
    setSelectedUserForEdit(user);
    setFormDialogOpen(true);
  }, []);

  // Handle single delete user trigger from row action
  const handleDeleteUser = useCallback((user: User) => {
    setUsersToDelete([user]);
    setDeleteDialogOpen(true);
  }, []);

  // Table meta callbacks passed down to row actions
  const tableMeta = useMemo<UsersTableMeta>(
    () => ({
      onEditUser: handleEditUser,
      onDeleteUser: handleDeleteUser,
    }),
    [handleEditUser, handleDeleteUser],
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

  const handleAddUser = () => {
    setSelectedUserForEdit(null);
    setFormDialogOpen(true);
  };

  const handleBatchDelete = () => {
    if (selectedCount === 0) return;
    const targets = selectedRows.map((r) => r.original);
    setUsersToDelete(targets);
    setDeleteDialogOpen(true);
  };

  const handleMutationSuccess = () => {
    setRowSelection({});
    fetchUsers();
  };

  const isDefaultSort = sorting.length === 1 && sorting[0].id === "id" && sorting[0].desc === true;
  const hasActiveSorts = !isDefaultSort && sorting.length > 0;
  const hasActiveFilters = Boolean((!isCustomer && roleFilter !== "all") || dateRange?.from);

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
            placeholder={
              isCustomer
                ? "Search customers by name or username..."
                : "Search users by name or username..."
            }
            value={search}
            onChange={setSearch}
          />

          {/* Faceted Role Filter (Staff view only) */}
          {!isCustomer && (
            <DataTableFacetedFilter
              title="Role"
              options={ROLE_OPTIONS}
              value={roleFilter}
              onValueChange={(val) => {
                setRoleFilter(val);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
            />
          )}
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

          {/* Batch Delete Button (shown when rows are selected) */}
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

          {/* Add User / Customer Button */}
          <Button size="sm" onClick={handleAddUser} className="h-8 gap-1.5 text-xs">
            <HugeiconsIcon icon={UserAdd01Icon} className="size-3.5" data-icon="inline-start" />
            <span>{isCustomer ? "Add Customer" : "Add User"}</span>
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
        {/* Role Chip (Staff view only) */}
        {!isCustomer && roleFilter !== "all" && (
          <Badge
            variant="secondary"
            className="shrink-0 gap-1 py-0.5 pl-2 pr-1 text-2xs font-normal"
          >
            <HugeiconsIcon
              icon={SecurityCheckIcon}
              className="size-2.5 text-muted-foreground shrink-0"
              data-icon="inline-start"
            />
            <span className="text-muted-foreground">Role:</span>
            <span className="font-medium">
              {ROLE_OPTIONS.find((o) => o.value === roleFilter)?.label ?? roleFilter}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                setRoleFilter("all");
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className="size-4 rounded-full p-0 text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
              aria-label="Remove role filter"
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

      {/* Main Datatable Surface */}
      <DataTableContent
        table={table}
        loading={loading}
        error={error}
        onRetry={fetchUsers}
        emptyMessage={
          isCustomer
            ? "No customers found matching the specified filters."
            : "No users found matching the specified filters."
        }
        loadingMessage={isCustomer ? "Loading customers..." : "Loading users..."}
      />

      {/* Pagination Controls */}
      <DataTablePagination table={table} />

      {/* Add / Edit User Form Modal */}
      <UserFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        user={selectedUserForEdit}
        onSuccess={handleMutationSuccess}
        fixedRole={isCustomer ? "customer" : undefined}
      />

      {/* Delete User Confirmation Modal */}
      <UserDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        users={usersToDelete}
        onSuccess={handleMutationSuccess}
        entityLabel={isCustomer ? "customer" : "user"}
      />
    </div>
  );
}
