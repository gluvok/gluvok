/**
 * @file components/projects/columns/rates.tsx
 * @description Column definitions and rendering helpers for the Rates entity table.
 */

import { type ColumnDef, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { IndianRupee, Ruler, Tag } from "lucide-react";
import { createCustomColumn, createTextColumn } from "./helpers";
import { getCommodityIcon } from "@/lib/fields";

export function getRatesColumns<T extends RowData>(): ColumnDef<ProjectTableFeatures, T>[] {
  return [
    createCustomColumn<T>("commodity_name", "Commodity Name", Tag, (val, row) => {
      const rec = row as Record<string, unknown>;
      const name = val || (rec.commodities as { name?: string } | undefined)?.name || "";
      const Icon = getCommodityIcon(name);
      return (
        <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
          <Icon className="h-3.5 w-3.5 text-muted-foreground/75" />
          {name || "—"}
        </div>
      );
    }),
    createCustomColumn("unit_price", "Unit Price", IndianRupee, (val) => {
      const price = parseFloat(val);
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(price);
      return (
        <div className="font-medium text-xs text-emerald-600 dark:text-emerald-500 font-mono">
          {formatted}
        </div>
      );
    }),
    createTextColumn("unit", "Unit", Ruler),
  ];
}
