/**
 * @file components/projects/columns/centers.tsx
 * @description Column definitions and rendering helpers for the Centers entity table.
 */

import { type ColumnDef, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { Tag, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { createTextColumn, createCustomColumn, badgeBaseClass } from "./helpers";
import { cn } from "@/lib/utils";

export function getCentersColumns<T extends RowData>(): ColumnDef<ProjectTableFeatures, T>[] {
  return [
    createTextColumn("name", "Name", Tag),
    createCustomColumn("auto_approve", "Auto Approve", ShieldCheck, (val) => {
      const isAuto = val === true || val === "true";
      return (
        <span className={cn(badgeBaseClass, "gap-1.5")}>
          {isAuto ? (
            <>
              <CheckCircle2 className="h-3 w-3 shrink-0" />
              Enabled
            </>
          ) : (
            <>
              <XCircle className="h-3 w-3 shrink-0 text-muted-foreground" />
              Disabled
            </>
          )}
        </span>
      );
    }),
  ];
}
