"use client";

/**
 * @file components/projects/filters/entries.tsx
 * @description Filter controls for the Entries entity table.
 */

import * as React from "react";
import { type ReactTable, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { EntryStatus, EntrySource, FieldType } from "@/lib/constants/enums";
import { BaseCombobox } from "@/components/combobox/base";
import { getSourceIcon, getStatusIcon, getAutoApproveIcon } from "@/lib/fields/helpers";
import { CenterFilter, CustomerFilter, UserFilter, setTableColumnFilter } from "./common";

interface EntriesFiltersProps<TData extends RowData> {
  table: ReactTable<ProjectTableFeatures, TData>;
}

const VERIFICATION_OPTIONS = [
  { value: "all", label: "All Verifications" },
  { value: "true", label: "System Approved" },
  { value: "false", label: "User Review" },
];

export function EntriesFilters<TData extends RowData>({ table }: EntriesFiltersProps<TData>) {
  const columnFilters = table.state.columnFilters;
  const currentStatus = columnFilters.find((f) => f.id === "status")?.value;
  const currentSource = columnFilters.find((f) => f.id === "source")?.value;
  const currentAutoApproved = columnFilters.find((f) => f.id === "auto_approved")?.value;

  const statusOptions = React.useMemo(() => {
    return [
      { value: "all", label: "All Statuses" },
      { value: EntryStatus.PENDING, label: "Pending" },
      { value: EntryStatus.APPROVED, label: "Approved" },
      { value: EntryStatus.REJECTED, label: "Rejected" },
    ];
  }, []);

  const sourceOptions = React.useMemo(() => {
    return [
      { value: "all", label: "All Sources" },
      { value: EntrySource.DEVICE, label: "Device" },
      { value: EntrySource.MANUAL, label: "Manual" },
    ];
  }, []);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Source */}
      <BaseCombobox
        type="source"
        value={currentSource ? String(currentSource) : "all"}
        onChange={(val) => setTableColumnFilter(table, "source", val === "all" ? undefined : val)}
        data={sourceOptions}
        placeholder="All Sources"
        searchPlaceholder="Search source..."
        icon={getSourceIcon(currentSource as string)}
        className="w-auto"
        id="filter-source-combobox"
      />

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

      {/* Verification / Auto Approved */}
      <BaseCombobox
        type="auto_approved"
        value={currentAutoApproved !== undefined ? String(currentAutoApproved) : "all"}
        onChange={(val) =>
          setTableColumnFilter(table, "auto_approved", val === "all" ? undefined : val)
        }
        data={VERIFICATION_OPTIONS}
        placeholder="All Verifications"
        searchPlaceholder="Search verification..."
        icon={getAutoApproveIcon(currentAutoApproved as string)}
        className="w-auto"
        id="filter-entries-auto-approved-combobox"
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
