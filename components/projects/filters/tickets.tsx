"use client";

/**
 * @file components/projects/filters/tickets.tsx
 * @description Filter controls for the Tickets entity table.
 */

import * as React from "react";
import { type ReactTable, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { TicketStatus } from "@/lib/constants/enums";
import { BaseCombobox } from "@/components/combobox/base";
import { getStatusIcon } from "@/lib/fields/helpers";
import { UserFilter, setTableColumnFilter } from "./common";

interface TicketsFiltersProps<TData extends RowData> {
  table: ReactTable<ProjectTableFeatures, TData>;
}

export function TicketsFilters<TData extends RowData>({ table }: TicketsFiltersProps<TData>) {
  const columnFilters = table.state.columnFilters;
  const currentStatus = columnFilters.find((f) => f.id === "status")?.value;

  const statusOptions = React.useMemo(() => {
    return [
      { value: "all", label: "All Statuses" },
      { value: TicketStatus.PENDING, label: "Pending" },
      { value: TicketStatus.APPROVED, label: "Approved" },
      { value: TicketStatus.REJECTED, label: "Rejected" },
    ];
  }, []);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Status Filter */}
      <BaseCombobox
        type="status"
        value={currentStatus ? String(currentStatus) : "all"}
        onChange={(val) => setTableColumnFilter(table, "status", val === "all" ? undefined : val)}
        data={statusOptions}
        placeholder="All Statuses"
        searchPlaceholder="Search status..."
        icon={getStatusIcon(currentStatus as string)}
        className="w-auto"
        id="filter-ticket-status-combobox"
      />

      {/* Creator User Filter (Provides "All Users" & search) */}
      <UserFilter table={table} />
    </div>
  );
}
