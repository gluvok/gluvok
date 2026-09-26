/**
 * @file components/data-table/column-header.tsx
 * @description Header cell renderer for DataTable columns supporting sorting controls and hide actions.
 */

import { type Column, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "./features";
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DataTableColumnHeaderProps<TData extends RowData, TValue> extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  column: Column<ProjectTableFeatures, TData, TValue>;
  title: React.ReactNode;
}

/**
 * DataTableColumnHeader Component
 * Column header cell wrapper rendering sort toggle dropdowns and visibility hide button.
 */
export function DataTableColumnHeader<TData extends RowData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const canSort = column.getCanSort();
  const canHide = column.getCanHide();

  if (!canSort && !canHide) return <div className={cn(className)}>{title}</div>;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent text-xs font-semibold"
          >
            <span>{title}</span>
            {canSort && column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : canSort && column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {canSort && (
            <>
              <DropdownMenuItem className="text-xs" onClick={() => column.toggleSorting(false)}>
                <ArrowUp className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" /> Asc
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs" onClick={() => column.toggleSorting(true)}>
                <ArrowDown className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" /> Desc
              </DropdownMenuItem>
              {canHide && <DropdownMenuSeparator />}
            </>
          )}
          {canHide && (
            <DropdownMenuItem className="text-xs" onClick={() => column.toggleVisibility(false)}>
              <EyeOff className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" /> Hide
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
