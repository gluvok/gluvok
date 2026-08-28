"use client";

/**
 * @file components/projects/filters/entries.tsx
 * @description Filter controls for the Entries entity table.
 */

import * as React from "react";
import { type ReactTable, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { EntryStatus, EntryType, FieldType, ProjectSlug } from "@/lib/constants/enums";
import { useEntitiesStore } from "@/lib/store";
import { Building, User as UserIcon, Users } from "lucide-react";
import { BaseCombobox } from "@/components/combobox/base";
import { getTypeIcon, getStatusIcon } from "@/lib/fields/helpers";
import { DateRangeFilter } from "./date-range-filter";

interface EntriesFiltersProps<TData extends RowData> {
  table: ReactTable<ProjectTableFeatures, TData>;
}

function useEntriesFilterData() {
  const weighmentFiltersData = useEntitiesStore((state) => state.weighmentFiltersData);

  return {
    centers: weighmentFiltersData?.centers || [],
    users: weighmentFiltersData?.users || [],
    customers: weighmentFiltersData?.customers || [],
  };
}

export function EntriesFilters<TData extends RowData>({ table }: EntriesFiltersProps<TData>) {
  const { centers, users, customers } = useEntriesFilterData();

  const columnFilters = table.state.columnFilters;
  const currentStatus = columnFilters.find((f) => f.id === "status")?.value;
  const currentType = columnFilters.find((f) => f.id === "type")?.value;
  const currentCenterId = columnFilters.find((f) => f.id === "center_id")?.value;
  const currentUserId = columnFilters.find((f) => f.id === "user_id")?.value;
  const currentCustomerId = columnFilters.find((f) => f.id === "customer_id")?.value;

  const setColumnFilter = (id: string, value: unknown) => {
    table.setColumnFilters((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      if (value !== undefined && value !== null && value !== "") {
        return [...filtered, { id, value }];
      }
      return filtered;
    });
  };

  const statusOptions = React.useMemo(() => {
    return [
      { value: "all", label: "All Statuses" },
      { value: EntryStatus.PENDING, label: "Pending" },
      { value: EntryStatus.APPROVED, label: "Approved" },
      { value: EntryStatus.REJECTED, label: "Rejected" },
    ];
  }, []);

  const typeOptions = React.useMemo(() => {
    return [
      { value: "all", label: "All Types" },
      { value: EntryType.MANUAL, label: "Manual" },
      { value: EntryType.AUTOMATIC, label: "Automatic" },
    ];
  }, []);

  const centerOptions = React.useMemo(() => {
    return [
      { value: "all", label: "All Centers" },
      ...centers.map((c) => ({
        value: String(c.id),
        label: c.name,
      })),
    ];
  }, [centers]);

  const userOptions = React.useMemo(() => {
    return [
      { value: "all", label: "All Operators" },
      ...users.map((u) => ({
        value: String(u.id),
        label: u.name,
      })),
    ];
  }, [users]);

  const customerOptions = React.useMemo(() => {
    return [
      { value: "all", label: "All Customers" },
      ...customers.map((c) => ({
        value: String(c.id),
        label: c.name,
      })),
    ];
  }, [customers]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Date Range */}
      <DateRangeFilter table={table} />

      {/* Status */}
      <BaseCombobox
        type={FieldType.ENTRY_STATUS}
        value={currentStatus ? String(currentStatus) : "all"}
        onChange={(val) => setColumnFilter("status", val === "all" ? undefined : val)}
        data={statusOptions}
        placeholder="All Statuses"
        searchPlaceholder="Search status..."
        icon={getStatusIcon(currentStatus as string)}
        className="w-auto"
        id="filter-status-combobox"
      />

      {/* Type */}
      <BaseCombobox
        type={FieldType.TYPE}
        value={currentType ? String(currentType) : "all"}
        onChange={(val) => setColumnFilter("type", val === "all" ? undefined : val)}
        data={typeOptions}
        placeholder="All Types"
        searchPlaceholder="Search type..."
        icon={getTypeIcon(currentType as string)}
        className="w-auto"
        id="filter-type-combobox"
      />

      {/* Center */}
      <BaseCombobox
        type={ProjectSlug.CENTERS}
        value={currentCenterId ? String(currentCenterId) : "all"}
        onChange={(val) => setColumnFilter("center_id", val === "all" ? undefined : Number(val))}
        data={centerOptions}
        placeholder="All Centers"
        searchPlaceholder="Search center..."
        icon={Building}
        className="w-auto"
        id="filter-center-combobox"
      />

      {/* Operator / User */}
      <BaseCombobox
        type={ProjectSlug.USERS}
        value={currentUserId ? String(currentUserId) : "all"}
        onChange={(val) => setColumnFilter("user_id", val === "all" ? undefined : Number(val))}
        data={userOptions}
        placeholder="All Operators"
        searchPlaceholder="Search operator..."
        icon={UserIcon}
        className="w-auto"
        id="filter-user-combobox"
      />

      {/* Customer */}
      <BaseCombobox
        type={ProjectSlug.CUSTOMERS}
        value={currentCustomerId ? String(currentCustomerId) : "all"}
        onChange={(val) => setColumnFilter("customer_id", val === "all" ? undefined : Number(val))}
        data={customerOptions}
        placeholder="All Customers"
        searchPlaceholder="Search customer..."
        icon={Users}
        className="w-auto"
        id="filter-customer-combobox"
      />
    </div>
  );
}
