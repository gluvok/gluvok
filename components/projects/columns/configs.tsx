/**
 * @file components/projects/columns/configs.tsx
 * @description Column definitions for the Configs entity table.
 */

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Fingerprint, ShieldCheck, Factory } from "lucide-react"
import { EntityKey, FieldRequirementMode, ColumnLabel } from "@/lib/constants/enums"
import { getModeIcon, getModeColorClass, getFieldRequirementModeLabel } from "@/lib/fields"
import { createCustomColumn, createIdColumn, createTextColumn } from "./helpers"

function ModeBadgeCell({ mode }: { mode: string }) {
  const modeVal = String(mode || FieldRequirementMode.MANDATORY)
  const colorClass = getModeColorClass(modeVal)
  const iconElement = React.createElement(getModeIcon(modeVal), { className: "h-3.5 w-3.5" })
  const label = getFieldRequirementModeLabel(modeVal)

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted/60 ${colorClass}`}>
      {iconElement}
      {label}
    </span>
  )
}

export function getConfigsColumns<T>(): ColumnDef<T>[] {
  return [
    createCustomColumn<T>(
      EntityKey.AADHAR_NUMBER_MODE,
      ColumnLabel.AADHAR_NUMBER_MODE,
      Fingerprint,
      (val) => <ModeBadgeCell mode={val} />
    ),
    createCustomColumn<T>(
      EntityKey.GOVT_ID_MODE,
      ColumnLabel.GOVT_ID_MODE,
      ShieldCheck,
      (val) => <ModeBadgeCell mode={val} />
    ),
    createIdColumn<T>(
      EntityKey.FACTORY_ID,
      ColumnLabel.FACTORY_ID,
      Factory
    ),
    createTextColumn<T>(
      EntityKey.FACTORY_NAME,
      ColumnLabel.FACTORY_NAME,
      Factory
    ),
  ]
}
