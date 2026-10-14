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
import { UserDeleteDialog } from "./user-delete-dialog";
import { StaffUserDialog } from "./staff-user-dialog";
import { CustomerUserDialog } from "./customer-user-dialog";

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

interface EntityConfig {
  tableId: string;
  entityLabel: string;
  searchPlaceholder: string;
  addButtonLabel: string;
  emptyMessage: string;
  loadingMessage: string;
  hasRoleFilter: boolean;
  extraParams?: Record<string, string>;
  showRoleColumn: boolean;
  FormDialog: React.ComponentType<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user?: User | null;
    onSuccess: () => void;
  }>;
}

const ENTITY_CONFIG: Record<"staff" | "customer", EntityConfig> = {
  staff: {
    tableId: "users",
    entityLabel: "User",
    searchPlaceholder: "Search staff accounts...",
    addButtonLabel: "Add Staff User",
    emptyMessage: "No staff accounts found matching the specified filters.",
    loadingMessage: "Loading staff accounts...",
    hasRoleFilter: true,
    extraParams: undefined,
    showRoleColumn: true,
    FormDialog: StaffUserDialog,
  },
  customer: {
    tableId: "customers",
    entityLabel: "Customer",
    searchPlaceholder: "Search customers...",
    addButtonLabel: "Add Customer",
    emptyMessage: "No customers found matching the specified filters.",
    loadingMessage: "Loading customers...",
    hasRoleFilter: false,
    extraParams: { role: "customer" },
    showRoleColumn: false,
    FormDialog: CustomerUserDialog,
  },
};

interface UsersDataTableProps {
  roleScope: "staff" | "customer";
}

export function UsersDataTable({ roleScope }: UsersDataTableProps) {
  const config = ENTITY_CONFIG[roleScope];
  const { FormDialog } = config;

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
    () => getColumns({ showRole: config.showRoleColumn, entityLabel: config.entityLabel }),
    [config.showRoleColumn, config.entityLabel],
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
    tableId: config.tableId,
    columns,
    endpoint: "/api/users",
    extraParams: config.extraParams,
    meta: tableMeta,
  });

  const roleFilter = tableState.filters["role"] ?? "all";

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
            placeholder={config.searchPlaceholder}
            value={search}
            onChange={setSearch}
          />

          {/* Faceted Role Filter (Staff view only) */}
          {config.hasRoleFilter && (
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
            <span>{config.addButtonLabel}</span>
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
        {config.hasRoleFilter && roleFilter !== "all" && (
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
        emptyMessage={config.emptyMessage}
        loadingMessage={config.loadingMessage}
      />

      {/* Pagination Controls */}
      <DataTablePagination table={table} />

      {/* Add / Edit User Form Modal (Dedicated Component) */}
      <FormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        user={selectedUserForEdit}
        onSuccess={handleMutationSuccess}
      />

      {/* Delete User Confirmation Modal */}
      <UserDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        users={usersToDelete}
        onSuccess={handleMutationSuccess}
        entityLabel={config.entityLabel.toLowerCase()}
      />
    </div>
  );
}
