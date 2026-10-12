import type { ReactTable, RowData } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { type DataTableFeatures } from "./data-table-features";

interface DataTablePaginationProps<TData extends RowData> {
  table: ReactTable<DataTableFeatures, TData>;
}

export function DataTablePagination<TData extends RowData>({
  table,
}: DataTablePaginationProps<TData>) {
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalCount = table.getFilteredRowModel().rows.length;
  const currentPage = table.state.pagination.pageIndex + 1;
  const totalPages = Math.max(1, table.getPageCount());

  return (
    <div className="flex flex-col items-center justify-between gap-4 px-2 py-4 sm:flex-row">
      <div className="text-xs text-muted-foreground">
        {selectedCount} of {totalCount} row(s) selected.
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium">Rows per page</p>
          <select
            className="h-7 rounded-md border border-input bg-background px-1.5 py-0.5 text-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            value={table.state.pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
          >
            {[10, 20, 30, 40, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-center text-xs font-medium">
          Page {currentPage} of {totalPages}
        </div>
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} data-icon="inline-start" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
            </PaginationItem>
            <PaginationItem>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="hidden sm:inline">Next</span>
                <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
