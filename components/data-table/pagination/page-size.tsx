/**
 * @file components/data-table/pagination/page-size.tsx
 * @description Page size selector dropdown for the DataTable pagination component.
 */

import { type Table } from "@tanstack/react-table";
import { List } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SMALL_SIZES = [5, 10, 20];
const LARGE_SIZES = [30, 40, 50];
const ALL_PAGE_SIZES = [...SMALL_SIZES, ...LARGE_SIZES];

/**
 * DataTablePaginationPageSize Component
 * Dropdown selector that adjusts table page size, hiding option levels exceeding total dataset row counts.
 */
export function DataTablePaginationPageSize<TData>({ table }: { table: Table<TData> }) {
  const pageSize = table.getState().pagination.pageSize;
  const totalRows = table.getCoreRowModel().rows.length;
  const isManual = !!table.options.manualPagination;

  // Only show sizes strictly less than totalRows
  const smallSizes = isManual ? SMALL_SIZES : SMALL_SIZES.filter((s) => s <= totalRows);
  const largeSizes = isManual ? LARGE_SIZES : LARGE_SIZES.filter((s) => s <= totalRows);

  // "All" option — the total itself, only if not already a standard size
  const allOption = isManual ? null : ALL_PAGE_SIZES.includes(totalRows) ? null : totalRows;

  const hasSmall = smallSizes.length > 0;
  const hasLarge = largeSizes.length > 0;
  const hasAny = hasSmall || hasLarge || allOption !== null;

  // If only one meaningful option or none at all, just show a label
  const totalOptions = smallSizes.length + largeSizes.length + (allOption ? 1 : 0);
  if (totalOptions <= 1) {
    return (
      <div className="flex items-center space-x-2">
        <List className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground">
          {totalRows} row{totalRows !== 1 ? "s" : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <List className="h-4 w-4 text-muted-foreground" />
      <p className="text-xs font-medium">Rows per page</p>
      <Select value={`${pageSize}`} onValueChange={(value) => table.setPageSize(Number(value))}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder={`${pageSize}`} />
        </SelectTrigger>
        <SelectContent side="top">
          {hasSmall && (
            <SelectGroup>
              <SelectLabel className="text-xs">Small Rows</SelectLabel>
              {smallSizes.map((size) => (
                <SelectItem key={size} value={`${size}`} className="text-xs">
                  {size}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          {hasSmall && (hasLarge || allOption !== null) && <SelectSeparator />}
          {hasLarge && (
            <SelectGroup>
              <SelectLabel className="text-xs">Large Rows</SelectLabel>
              {largeSizes.map((size) => (
                <SelectItem key={size} value={`${size}`} className="text-xs">
                  {size}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          {allOption !== null && (
            <>
              {hasAny && <SelectSeparator />}
              <SelectGroup>
                <SelectLabel className="text-xs">All Rows</SelectLabel>
                <SelectItem value={`${allOption}`} className="text-xs">
                  {allOption} (All)
                </SelectItem>
              </SelectGroup>
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
