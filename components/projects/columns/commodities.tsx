/**
 * @file components/projects/columns/commodities.tsx
 * @description Column definitions and rendering helpers for the Commodities entity table.
 */

import { type ColumnDef, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { Tag } from "lucide-react";
import { createCustomColumn } from "./helpers";
import { getCommodityIcon } from "@/lib/fields";

export function getCommoditiesColumns<T extends RowData>(): ColumnDef<ProjectTableFeatures, T>[] {
  return [
    createCustomColumn<T>("name", "Name", Tag, (val) => {
      const Icon = getCommodityIcon(val);
      return (
        <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {val}
        </div>
      );
    }),
  ];
}
