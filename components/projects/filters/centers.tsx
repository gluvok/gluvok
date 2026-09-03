"use client";

/**
 * @file components/projects/filters/centers.tsx
 * @description Filter controls for the Centers entity table.
 */

import { type ReactTable, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { getAutoApproveIcon } from "@/lib/fields/helpers";
import { BaseCombobox } from "@/components/combobox/base";
import { setTableColumnFilter } from "./common";

interface CentersFiltersProps<TData extends RowData> {
  table: ReactTable<ProjectTableFeatures, TData>;
}

const AUTO_APPROVE_OPTIONS = [
  { value: "all", label: "All Auto Approve" },
  { value: "true", label: "Enabled" },
  { value: "false", label: "Disabled" },
];

export function CentersFilters<TData extends RowData>({ table }: CentersFiltersProps<TData>) {
  const columnFilters = table.state.columnFilters;
  const currentAutoApprove = columnFilters.find((f) => f.id === "auto_approve")?.value as
    | string
    | undefined;

  return (
    <div className="flex items-center gap-2">
      <BaseCombobox
        type="auto_approve"
        value={currentAutoApprove !== undefined ? String(currentAutoApprove) : "all"}
        onChange={(val) =>
          setTableColumnFilter(table, "auto_approve", val === "all" ? undefined : val)
        }
        data={AUTO_APPROVE_OPTIONS}
        placeholder="All Auto Approve"
        searchPlaceholder="Search auto approve..."
        icon={getAutoApproveIcon(currentAutoApprove)}
        className="w-auto"
        id="filter-center-auto-approve-combobox"
      />
    </div>
  );
}
