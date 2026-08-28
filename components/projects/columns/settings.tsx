/**
 * @file components/projects/columns/settings.tsx
 * @description Column definitions for the Settings entity table.
 */

import * as React from "react";
import { type ColumnDef, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { Building, Fingerprint, ShieldCheck } from "lucide-react";
import { FieldRequirementMode } from "@/lib/constants/enums";
import { getModeIcon, getModeColorClass, getFieldRequirementModeLabel } from "@/lib/fields";
import { createCustomColumn } from "./helpers";

function ModeBadgeCell({ mode }: { mode: string }) {
  const modeVal = String(mode || FieldRequirementMode.MANDATORY);
  const colorClass = getModeColorClass(modeVal);
  const iconElement = React.createElement(getModeIcon(modeVal), { className: "h-3.5 w-3.5" });
  const label = getFieldRequirementModeLabel(modeVal);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-semibold bg-muted/60 ${colorClass}`}
    >
      {iconElement}
      {label}
    </span>
  );
}

export function getSettingsColumns<T extends RowData>(): ColumnDef<ProjectTableFeatures, T>[] {
  return [
    createCustomColumn<T>("name", "Factory Name", Building, (val) => (
      <span className="font-medium text-foreground">{String(val || "-")}</span>
    )),
    createCustomColumn<T>("aadhar_number_mode", "Aadhaar Number Mode", Fingerprint, (val) => (
      <ModeBadgeCell mode={val} />
    )),
    createCustomColumn<T>("govt_id_mode", "Govt ID Mode", ShieldCheck, (val) => (
      <ModeBadgeCell mode={val} />
    )),
  ];
}

export const getConfigsColumns = getSettingsColumns;
