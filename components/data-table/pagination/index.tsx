/**
 * @file components/data-table/pagination/index.tsx
 * @description Master pagination control bar for DataTable, assembling rows counts, page size dropdowns, and navigation buttons.
 */

import { type RowData, type ReactTable } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "../features";
import { DataTablePaginationRowsCount } from "./rows-count";
import { DataTablePaginationPageSize } from "./page-size";
import { DataTablePaginationButtons } from "./buttons";

interface DataTablePaginationProps<TData extends RowData> {
  table: ReactTable<ProjectTableFeatures, TData>;
}

/**
 * DataTablePagination Component
 * Renders the full pagination toolbar beneath a table, supporting multi-layout responsive sizing.
 */
export function DataTablePagination<TData extends RowData>({
  table,
}: DataTablePaginationProps<TData>) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-2 py-1">
      <DataTablePaginationRowsCount table={table} />
      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-4 sm:gap-6 lg:gap-8">
        <DataTablePaginationPageSize table={table} />
        <DataTablePaginationButtons table={table} />
      </div>
    </div>
  );
}
