"use client";

/**
 * @file components/projects/filters/entries.tsx
 * @description Filter controls for the Entries entity table.
 */

import * as React from "react";
import { type ReactTable, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { EntryStatus, EntryType, FieldType } from "@/lib/constants/enums";
import { BaseCombobox } from "@/components/combobox/base";
import { getTypeIcon, getStatusIcon } from "@/lib/fields/helpers";
import { DateRangeFilter } from "./date-range-filter";
import { CenterFilter, CustomerFilter, UserFilter, setTableColumnFilter } from "./common";

interface EntriesFiltersProps<TData extends RowData> {
  table: ReactTable<ProjectTableFeatures, TData>;
}

export function EntriesFilters<TData extends RowData>({ table }: EntriesFiltersProps<TData>) {
  const columnFilters = table.state.columnFilters;
  const currentStatus = columnFilters.find((f) => f.id === "status")?.value;
  const currentType = columnFilters.find((f) => f.id === "type")?.value;

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

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Date Range */}
      <DateRangeFilter table={table} />

      {/* Status */}
      <BaseCombobox
        type={FieldType.ENTRY_STATUS}
        value={currentStatus ? String(currentStatus) : "all"}
        onChange={(val) => setTableColumnFilter(table, "status", val === "all" ? undefined : val)}
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
        onChange={(val) => setTableColumnFilter(table, "type", val === "all" ? undefined : val)}
        data={typeOptions}
        placeholder="All Types"
        searchPlaceholder="Search type..."
        icon={getTypeIcon(currentType as string)}
        className="w-auto"
        id="filter-type-combobox"
      />

      {/* Center */}
      <CenterFilter table={table} />

      {/* Operator / User */}
      <UserFilter table={table} />

      {/* Customer */}
      <CustomerFilter table={table} />
    </div>
  );
}
