/**
 * @file components/data-table/pagination/rows-count.tsx
 * @description Row selection status text for the DataTable pagination component.
 */

import { type RowData, type Table } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "../features";
import { CheckSquare } from "lucide-react";

/**
 * DataTablePaginationRowsCount Component
 * Renders selection helper labels e.g. "2 of 20 row(s) selected".
 */
export function DataTablePaginationRowsCount<TData extends RowData>({
  table,
}: {
  table: Table<ProjectTableFeatures, TData>;
}) {
  return (
    <div className="text-xs text-muted-foreground flex items-center gap-1.5 justify-center sm:justify-start">
      <CheckSquare className="h-4 w-4 text-primary" />
      <span>
        {table.getFilteredSelectedRowModel().rows.length} of{" "}
        {table.getFilteredRowModel().rows.length} row(s) selected.
      </span>
    </div>
  );
}
