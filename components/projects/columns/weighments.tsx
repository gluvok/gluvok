/**
 * @file components/projects/columns/weighments.tsx
 * @description Column definitions and rendering helpers for the Weighments entity table.
 */

import { ColumnDef } from "@tanstack/react-table"
import { Tag, Weight, Ruler, Image, Building, User, Users, Clock, ArrowLeftRight } from "lucide-react"
import { EntityKey, ColumnLabel, WeighmentType } from "@/lib/constants/enums"
import { createTextColumn, createBaseColumn, createIdColumn, badgeBaseClass } from "./helpers"
import { WeighmentImagesCell } from "./weighments-cell"

export function getWeighmentsColumns<T>(): ColumnDef<T>[] {
  return [
    createIdColumn(EntityKey.ID, ColumnLabel.ID, Tag),
    createTextColumn(EntityKey.UNIT, ColumnLabel.UNIT, Ruler),
    createBaseColumn(
      EntityKey.TYPE,
      ColumnLabel.TYPE,
      ArrowLeftRight,
      ({ row }) => {
        const val = (row.getValue(EntityKey.TYPE) as string) || WeighmentType.UNASSIGNED
        let badgeColor = "bg-muted/80 text-muted-foreground border-border"
        if (val === WeighmentType.IN) {
          badgeColor = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        } else if (val === WeighmentType.OUT) {
          badgeColor = "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
        }
        return (
          <span className={`${badgeBaseClass} ${badgeColor} capitalize`}>
            {val}
          </span>
        )
      }
    ),
    createBaseColumn(
      EntityKey.GROSS_WEIGHT,
      ColumnLabel.GROSS_WEIGHT,
      Weight,
      ({ row }) => {
        const val = row.getValue(EntityKey.GROSS_WEIGHT) as number
        return (
          <div className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {val}
          </div>
        )
      }
    ),
    createBaseColumn(
      EntityKey.TARE_WEIGHT,
      ColumnLabel.TARE_WEIGHT,
      Weight,
      ({ row }) => {
        const val = row.getValue(EntityKey.TARE_WEIGHT) as number
        return (
          <div className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
            {val}
          </div>
        )
      }
    ),
    createBaseColumn(
      EntityKey.NET_WEIGHT,
      ColumnLabel.NET_WEIGHT,
      Weight,
      ({ row }) => {
        const val = row.getValue(EntityKey.NET_WEIGHT) as number
        return (
          <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
            {val}
          </div>
        )
      }
    ),
    {
      ...createBaseColumn(
        EntityKey.IMAGES,
        ColumnLabel.IMAGES,
        Image,
        ({ row }) => {
          const images = row.getValue(EntityKey.IMAGES) as string[] | undefined
          const vehicleNumber = ((row.original as Record<string, unknown>)?.vehicle_number as string) || "Weighment"
          return <WeighmentImagesCell images={images} vehicleNumber={vehicleNumber} />
        }
      ),
      enableGlobalFilter: false,
      enableSorting: false,
    },
    createIdColumn(EntityKey.IN_ENTRY_ID, ColumnLabel.IN_ENTRY_ID, Tag),
    createTextColumn(EntityKey.IN_ENTRY_CREATED_AT, ColumnLabel.IN_ENTRY_CREATED_AT, Clock, "font-mono text-muted-foreground text-xs"),
    createIdColumn(EntityKey.OUT_ENTRY_ID, ColumnLabel.OUT_ENTRY_ID, Tag),
    createTextColumn(EntityKey.OUT_ENTRY_CREATED_AT, ColumnLabel.OUT_ENTRY_CREATED_AT, Clock, "font-mono text-muted-foreground text-xs"),
    createIdColumn(EntityKey.IN_CENTER_ID, ColumnLabel.IN_CENTER_ID, Building),
    createTextColumn(EntityKey.IN_CENTER_NAME, ColumnLabel.IN_CENTER_NAME, Building),
    createIdColumn(EntityKey.OUT_CENTER_ID, ColumnLabel.OUT_CENTER_ID, Building),
    createTextColumn(EntityKey.OUT_CENTER_NAME, ColumnLabel.OUT_CENTER_NAME, Building),
    createIdColumn(EntityKey.IN_PROFILE_ID, ColumnLabel.IN_PROFILE_ID, User),
    createTextColumn(EntityKey.IN_PROFILE_NAME, ColumnLabel.IN_PROFILE_NAME, User),
    createIdColumn(EntityKey.OUT_PROFILE_ID, ColumnLabel.OUT_PROFILE_ID, User),
    createTextColumn(EntityKey.OUT_PROFILE_NAME, ColumnLabel.OUT_PROFILE_NAME, User),
    createIdColumn(EntityKey.IN_CUSTOMER_ID, ColumnLabel.IN_CUSTOMER_ID, Users),
    createTextColumn(EntityKey.IN_CUSTOMER_NAME, ColumnLabel.IN_CUSTOMER_NAME, Users),
    createIdColumn(EntityKey.OUT_CUSTOMER_ID, ColumnLabel.OUT_CUSTOMER_ID, Users),
    createTextColumn(EntityKey.OUT_CUSTOMER_NAME, ColumnLabel.OUT_CUSTOMER_NAME, Users),
    createTextColumn(EntityKey.CREATED_AT, ColumnLabel.CREATED_AT, Clock, "font-mono text-muted-foreground text-xs"),
    createTextColumn(EntityKey.UPDATED_AT, ColumnLabel.UPDATED_AT, Clock, "font-mono text-muted-foreground text-xs"),
  ]
}
