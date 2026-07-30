/**
 * @file components/projects/columns/weighments.tsx
 * @description Column definitions and rendering helpers for the Weighments entity table.
 */

import { ColumnDef } from "@tanstack/react-table"
import { Car, Weight, Ruler, Power, Image, Package, Building, Fingerprint, User, ShieldCheck, Users, ArrowUpDown } from "lucide-react"
import { EntityKey, WeighmentType } from "@/lib/constants/enums"
import { ColumnLabel, ActiveStatus } from "@/lib/constants/enums"
import { getTypeIcon } from "@/lib/fields/helpers"
import { cn } from "@/lib/utils"
import { type Weighment } from "@/types"
import { createTextColumn, createBaseColumn, createCustomColumn, createIdColumn, badgeBaseClass } from "./helpers"
import { WeighmentImagesCell } from "./weighments-cell"

export function getWeighmentsColumns<T>(): ColumnDef<T>[] {
  return [
    createTextColumn(EntityKey.VEHICLE_NUMBER, ColumnLabel.VEHICLE_NUMBER, Car),
    createCustomColumn(EntityKey.TYPE, ColumnLabel.TYPE, ArrowUpDown, (val) => {
      const isOut = val === WeighmentType.OUT
      const TypeIcon = getTypeIcon(String(val))
      return (
        <span className={cn(
          badgeBaseClass,
          "gap-1",
          isOut
            ? "bg-amber-50 text-amber-700 border border-amber-200/50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/30"
            : "bg-blue-50 text-blue-700 border border-blue-200/50 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/30"
        )}>
          <TypeIcon className="h-3 w-3 shrink-0" />
          <span>{isOut ? "Out" : "In"}</span>
        </span>
      )
    }),
    createBaseColumn(
      EntityKey.WEIGHT,
      ColumnLabel.WEIGHT,
      Weight,
      ({ row }) => {
        const val = row.original as Weighment
        return (
          <div className="font-mono text-xs font-semibold text-foreground">
            {val.weight}
          </div>
        )
      }
    ),
    createTextColumn(EntityKey.UNIT, ColumnLabel.UNIT, Ruler),
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
    createIdColumn(EntityKey.RATE_ID, ColumnLabel.RATE_ID, Package),
    createIdColumn(EntityKey.CENTER_ID, ColumnLabel.CENTER_ID, Building),
    createTextColumn(EntityKey.CENTER_NAME, ColumnLabel.CENTER_NAME, Building),
    createIdColumn(EntityKey.PROFILE_ID, ColumnLabel.PROFILE_ID, User),
    createTextColumn(EntityKey.PROFILE_NAME, ColumnLabel.PROFILE_NAME, User),
    createTextColumn(EntityKey.PROFILE_AADHAR, ColumnLabel.AADHAR_NUMBER, Fingerprint, "font-mono text-muted-foreground text-xs"),
    createIdColumn(EntityKey.CUSTOMER_ID, ColumnLabel.CUSTOMER_ID, Users),
    createTextColumn(EntityKey.CUSTOMER_NAME, ColumnLabel.CUSTOMER_NAME, Users),
    createTextColumn(EntityKey.CUSTOMER_GOVT_ID, ColumnLabel.GOVT_ID, ShieldCheck, "font-mono text-muted-foreground text-xs"),
    createCustomColumn(EntityKey.IS_ACTIVE, ColumnLabel.IS_ACTIVE, Power, (val) => {
      const isActive = val === "true"
      return (
        <span className={cn(
          badgeBaseClass,
          isActive
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/30"
            : "bg-muted text-muted-foreground border border-border"
        )}>
          {isActive ? ActiveStatus.ACTIVE : ActiveStatus.INACTIVE}
        </span>
      )
    }),
  ]
}
