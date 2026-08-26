/**
 * @file components/projects/columns/commodities.tsx
 * @description Column definitions and rendering helpers for the Commodities entity table.
 */

import { ColumnDef } from "@tanstack/react-table";
import { Tag } from "lucide-react";
import { EntityKey } from "@/lib/constants/enums";
import { ColumnLabel } from "@/lib/constants/enums";
import { createCustomColumn } from "./helpers";
import { getCommodityIcon } from "@/lib/fields";

export function getCommoditiesColumns<T>(): ColumnDef<T>[] {
  return [
    createCustomColumn<T>(EntityKey.NAME, ColumnLabel.NAME, Tag, (val) => {
      const Icon = getCommodityIcon(val);
      return (
        <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
          <Icon className="h-3.5 w-3.5 text-muted-foreground/75" />
          {val}
        </div>
      );
    }),
  ];
}
