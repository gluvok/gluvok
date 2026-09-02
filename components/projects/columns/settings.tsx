/**
 * @file components/projects/columns/settings.tsx
 * @description Column definitions and rendering helpers for the Settings entity table.
 */

import { type ColumnDef, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { Building, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { getAutoApproveColorClass } from "@/lib/fields/helpers";
import { createTextColumn, createCustomColumn, badgeBaseClass } from "./helpers";
import { cn } from "@/lib/utils";

export function getSettingsColumns<T extends RowData>(): ColumnDef<ProjectTableFeatures, T>[] {
  return [
    createTextColumn("name", "Factory Name", Building),
    createCustomColumn("check_center_on_merge", "Check Center On Merge", ShieldCheck, (val) => {
      const isEnabled = val === true || val === "true";
      const colorClass = getAutoApproveColorClass(isEnabled ? "true" : "false");
      return (
        <span className={cn(badgeBaseClass, "gap-1.5", colorClass)}>
          {isEnabled ? (
            <>
              <CheckCircle2 className="h-3 w-3 shrink-0" />
              Enabled
            </>
          ) : (
            <>
              <XCircle className="h-3 w-3 shrink-0" />
              Disabled
            </>
          )}
        </span>
      );
    }),
  ];
}
