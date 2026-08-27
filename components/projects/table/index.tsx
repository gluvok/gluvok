/**
 * @file components/projects/table/index.tsx
 * @description Renders the core table grid with loading and empty fallbacks using TanStack React Table context.
 */

import { type ReactTable, flexRender, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import {
  Table as TableGrid,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ProjectTableLoading } from "./loading";
import { ProjectTableEmpty } from "./empty";

interface ProjectTableProps<TData extends RowData> {
  table: ReactTable<ProjectTableFeatures, TData>;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

/**
 * ProjectTable Component
 * Generates the header rows and cell renders for each entity page. Handles loading states.
 */
export function ProjectTable<TData extends RowData>({
  table,
  isLoading,
  error,
  onRetry,
}: ProjectTableProps<TData>) {
  if (isLoading) return <ProjectTableLoading />;

  if (error) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-destructive">{error}</p>
        {onRetry && (
          <Button onClick={onRetry} size="sm" variant="outline">
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (!table.getRowModel().rows?.length) {
    return <ProjectTableEmpty />;
  }

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden transition-all duration-300 **:data-[slot=table-container]:max-h-104">
      <TableGrid>
        <TableHeader className="bg-card sticky top-0 z-10 border-b">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent border-b">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="h-10 text-xs py-2 font-semibold">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() && "selected"}
              className="hover:bg-muted/10 transition-colors duration-150 border-b last:border-b-0"
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="py-3 text-xs">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </TableGrid>
    </div>
  );
}
