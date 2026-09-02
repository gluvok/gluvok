/**
 * @file components/projects/columns/rates.tsx
 * @description Column definitions and rendering helpers for the Rates entity table.
 */

import { type ColumnDef, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { IndianRupee, Ruler, Tag } from "lucide-react";
import { createCustomColumn } from "./helpers";
import { getCommodityIcon } from "@/lib/fields";
import { cn } from "@/lib/utils";

function getUnitBadgeClass(unit: string): string {
  switch (unit.toLowerCase()) {
    case "kg":
      return "bg-slate-100 text-slate-700 border border-slate-200/60 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700/40";
    case "q":
      return "bg-amber-50 text-amber-700 border border-amber-200/50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/30";
    case "gal":
      return "bg-blue-50 text-blue-700 border border-blue-200/50 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/30";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}

export function getRatesColumns<T extends RowData>(): ColumnDef<ProjectTableFeatures, T>[] {
  return [
    createCustomColumn<T>("commodity_name", "Commodity Name", Tag, (val, row) => {
      const rec = row as Record<string, unknown>;
      const name = val || (rec.commodities as { name?: string } | undefined)?.name || "";
      const Icon = getCommodityIcon(name);
      return (
        <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
          <Icon className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
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
    createCustomColumn("unit", "Unit", Ruler, (val) => {
      const unit = String(val || "");
      return (
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold shadow-sm uppercase tracking-wide",
            getUnitBadgeClass(unit),
          )}
        >
          <Ruler className="h-3 w-3 mr-1 shrink-0" />
          {unit}
        </span>
      );
    }),
  ];
}
