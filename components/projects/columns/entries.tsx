/**
 * @file components/projects/columns/entries.tsx
 * @description Column definitions and rendering helpers for the Entries entity table.
 */

import { ColumnDef } from "@tanstack/react-table"
import { Tag, Car, Weight, Building, User, Users, Image, ShieldCheck, Clock } from "lucide-react"
import { EntityKey, ColumnLabel, EntryStatus } from "@/lib/constants/enums"
import { cn } from "@/lib/utils"
import { createTextColumn, createBaseColumn, createCustomColumn, createIdColumn, badgeBaseClass } from "./helpers"
import { WeighmentImagesCell } from "./weighments-cell"

export function getEntriesColumns<T>(): ColumnDef<T>[] {
  return [
    createIdColumn(EntityKey.ID, ColumnLabel.ID, Tag),
    createTextColumn(EntityKey.DETECTED_VEHICLE_NUMBER, ColumnLabel.DETECTED_VEHICLE_NUMBER, Car),
    createTextColumn(EntityKey.VEHICLE_NUMBER, ColumnLabel.VEHICLE_NUMBER, Car),
    createBaseColumn(
      EntityKey.WEIGHT,
      ColumnLabel.WEIGHT,
      Weight,
      ({ row }) => {
        const val = row.getValue(EntityKey.WEIGHT) as number
        return (
          <div className="font-mono text-xs font-semibold text-foreground">
            {val}
          </div>
        )
      }
    ),
    createCustomColumn(EntityKey.STATUS, ColumnLabel.STATUS, ShieldCheck, (val) => {
      const status = String(val).toLowerCase()
      let statusClass = "bg-muted text-muted-foreground border border-border"
      if (status === EntryStatus.APPROVED) {
        statusClass = "bg-emerald-50 text-emerald-700 border border-emerald-200/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/30"
      } else if (status === EntryStatus.PENDING) {
        statusClass = "bg-amber-50 text-amber-700 border border-amber-200/50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/30"
      } else if (status === EntryStatus.REJECTED) {
        statusClass = "bg-rose-50 text-rose-700 border border-rose-200/50 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/30"
      }
      return (
        <span className={cn(badgeBaseClass, "capitalize", statusClass)}>
          {status}
        </span>
      )
    }),
    createIdColumn(EntityKey.CENTER_ID, ColumnLabel.CENTER_ID, Building),
    createTextColumn(EntityKey.CENTER_NAME, ColumnLabel.CENTER_NAME, Building),
    createIdColumn(EntityKey.PROFILE_ID, ColumnLabel.PROFILE_ID, User),
    createTextColumn(EntityKey.PROFILE_NAME, ColumnLabel.PROFILE_NAME, User),
    createIdColumn(EntityKey.CUSTOMER_ID, ColumnLabel.CUSTOMER_ID, Users),
    createTextColumn(EntityKey.CUSTOMER_NAME, ColumnLabel.CUSTOMER_NAME, Users),
    {
      ...createBaseColumn(
        EntityKey.IMAGES,
        ColumnLabel.IMAGES,
        Image,
        ({ row }) => {
          const images = row.getValue(EntityKey.IMAGES) as string[] | undefined
          const vehicleNumber = row.getValue(EntityKey.VEHICLE_NUMBER) as string
          return <WeighmentImagesCell images={images} vehicleNumber={vehicleNumber} />
        }
      ),
      enableGlobalFilter: false,
      enableSorting: false,
    },
    createTextColumn(EntityKey.CREATED_AT, ColumnLabel.CREATED_AT, Clock, "font-mono text-muted-foreground text-xs"),
    createTextColumn(EntityKey.UPDATED_AT, ColumnLabel.UPDATED_AT, Clock, "font-mono text-muted-foreground text-xs"),
  ]
}
