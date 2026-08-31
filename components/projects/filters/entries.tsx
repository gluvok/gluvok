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
import { getTypeIcon, getStatusIcon, getAutoApproveIcon, getEditedIcon } from "@/lib/fields/helpers";
import { DateRangeFilter } from "./date-range-filter";
import { CenterFilter, CustomerFilter, UserFilter, setTableColumnFilter } from "./common";

interface EntriesFiltersProps<TData extends RowData> {
  table: ReactTable<ProjectTableFeatures, TData>;
}

const AUTO_APPROVED_OPTIONS = [
  { value: "all", label: "All Auto Approve" },
  { value: "true", label: "Auto Approved" },
  { value: "false", label: "Manual" },
];

const EDITED_OPTIONS = [
  { value: "all", label: "All Edit Statuses" },
  { value: "true", label: "Edited" },
  { value: "false", label: "Original" },
];

export function EntriesFilters<TData extends RowData>({ table }: EntriesFiltersProps<TData>) {
  const columnFilters = table.state.columnFilters;
  const currentStatus = columnFilters.find((f) => f.id === "status")?.value;
  const currentType = columnFilters.find((f) => f.id === "type")?.value;
  const currentAutoApproved = columnFilters.find((f) => f.id === "auto_approved")?.value;
  const currentEdited = columnFilters.find((f) => f.id === "edited")?.value;

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

      {/* Auto Approved */}
      <BaseCombobox
        type="auto_approved"
        value={currentAutoApproved !== undefined ? String(currentAutoApproved) : "all"}
        onChange={(val) =>
          setTableColumnFilter(table, "auto_approved", val === "all" ? undefined : val)
        }
        data={AUTO_APPROVED_OPTIONS}
        placeholder="All Auto Approve"
        searchPlaceholder="Search auto approve..."
        icon={getAutoApproveIcon(currentAutoApproved as string)}
        className="w-auto"
        id="filter-entries-auto-approved-combobox"
      />

      {/* Edited */}
      <BaseCombobox
        type="edited"
        value={currentEdited !== undefined ? String(currentEdited) : "all"}
        onChange={(val) => setTableColumnFilter(table, "edited", val === "all" ? undefined : val)}
        data={EDITED_OPTIONS}
        placeholder="All Edit Statuses"
        searchPlaceholder="Search edit status..."
        icon={getEditedIcon(currentEdited as string)}
        className="w-auto"
        id="filter-entries-edited-combobox"
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
