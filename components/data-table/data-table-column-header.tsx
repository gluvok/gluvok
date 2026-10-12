import type { HTMLAttributes } from "react";
import type { Column, RowData } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, ArrowUp01Icon, EyeIcon, Sorting05Icon } from "@hugeicons/core-free-icons";
import { type DataTableFeatures } from "./data-table-features";

interface DataTableColumnHeaderProps<
  TData extends RowData,
  TValue = unknown,
> extends HTMLAttributes<HTMLDivElement> {
  column: Column<DataTableFeatures, TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData extends RowData, TValue = unknown>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn("text-xs font-medium", className)}>{title}</div>;
  }

  const isSorted = column.getIsSorted();

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 h-7 gap-1 px-2 text-xs data-popup-open:bg-accent"
            >
              <span>{title}</span>
              {isSorted === "desc" ? (
                <HugeiconsIcon icon={ArrowDown01Icon} data-icon="inline-end" />
              ) : isSorted === "asc" ? (
                <HugeiconsIcon icon={ArrowUp01Icon} data-icon="inline-end" />
              ) : (
                <HugeiconsIcon
                  icon={Sorting05Icon}
                  data-icon="inline-end"
                  className="text-muted-foreground/70"
                />
              )}
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-32">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
              <HugeiconsIcon icon={ArrowUp01Icon} />
              <span>Asc</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
              <HugeiconsIcon icon={ArrowDown01Icon} />
              <span>Desc</span>
            </DropdownMenuItem>
            {column.getCanHide() && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
                  <HugeiconsIcon icon={EyeIcon} />
                  <span>Hide</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
