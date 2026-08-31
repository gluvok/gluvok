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
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalCount = table.getRowCount?.() ?? table.getFilteredRowModel().rows.length;

  return (
    <div className="text-xs text-muted-foreground flex items-center gap-1.5 justify-center sm:justify-start">
      <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" />
      <span>
        {selectedCount > 0 ? (
          <>
            <strong className="font-semibold text-primary">{selectedCount}</strong> of{" "}
            <strong className="font-medium text-foreground">{totalCount.toLocaleString()}</strong>{" "}
            row{totalCount === 1 ? "" : "s"} selected
          </>
        ) : (
          <>
            <strong className="font-medium text-foreground">{totalCount.toLocaleString()}</strong>{" "}
            total record{totalCount === 1 ? "" : "s"}
          </>
        )}
      </span>
    </div>
  );
}
