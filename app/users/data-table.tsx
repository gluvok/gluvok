"use client";

import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { DataTableHydrationCard } from "@/components/data-table/data-table-hydration-card";
import { useDataTable } from "@/components/data-table/use-data-table";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Briefcase01Icon,
  Calendar01Icon,
  Cancel01Icon,
  Clock01Icon,
  CrownIcon,
  Delete02Icon,
  HashtagIcon,
  HeadsetIcon,
  SecurityCheckIcon,
  TextFontIcon,
  UserAdd01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { getColumns, type UsersTableMeta } from "./columns";
import { type User } from "./types";
import { UserFormDialog } from "./user-form-dialog";
import { UserDeleteDialog } from "./user-delete-dialog";

const ROLE_OPTIONS: FacetedFilterOption[] = [
  { label: "All Roles", value: "all", icon: SecurityCheckIcon },
  { label: "Admin", value: "admin", icon: CrownIcon },
  { label: "Manager", value: "manager", icon: Briefcase01Icon },
  { label: "Operator", value: "operator", icon: HeadsetIcon },
  { label: "Base User", value: "base", icon: UserIcon },
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

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState<boolean>(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [usersToDelete, setUsersToDelete] = useState<User[]>([]);

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

  const columns = useMemo(
    () => getColumns({ showRole: !isCustomer, entityLabel }),
    [isCustomer, entityLabel],
  );

  const extraParams = useMemo(() => (isCustomer ? { role: "customer" } : undefined), [isCustomer]);

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
    setRowSelection,
    selectedRows,
    selectedCount,
    hasActiveSorts,
    hasActiveFilters,
    resetAllCriteria,
    setFilter,
    refresh,
    tableState,
  } = useDataTable<User>({
    tableId,
    columns,
    endpoint: "/api/users",
    extraParams,
    meta: tableMeta,
  });

  const roleFilter = isCustomer ? "customer" : (tableState.filters["role"] ?? "all");

  const handleAddUser = () => {
    setSelectedUserForEdit(null);
    setFormDialogOpen(true);
  };

  const handleBatchDelete = () => {
    if (selectedCount === 0) return;
    setUsersToDelete(selectedRows);
    setDeleteDialogOpen(true);
  };

  const handleMutationSuccess = () => {
    setRowSelection({});
    refresh();
  };

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
            placeholder={isCustomer ? "Search customers..." : "Search users..."}
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
                setFilter("role", val);
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
                setFilter("role", "all");
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
        onRetry={refresh}
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
