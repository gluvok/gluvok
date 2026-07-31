/**
 * @file components/projects/columns/profiles.tsx
 * @description Column definitions and rendering helpers for the Profiles entity table.
 */

import { ColumnDef } from "@tanstack/react-table"
import { Fingerprint, Tag, Shield } from "lucide-react"
import { EntityKey, ColumnLabel } from "@/lib/constants/enums"
import { getRoleIcon, getRoleLabel } from "@/lib/fields/helpers"
import { createTextColumn, createCustomColumn } from "./helpers"

import { RolePill } from "@/components/kibo-ui/pill"

export function getProfilesColumns<T>(): ColumnDef<T>[] {
  return [
    createTextColumn(EntityKey.AADHAR_NUMBER, ColumnLabel.AADHAR_NUMBER, Fingerprint, "font-mono text-muted-foreground text-xs"),
    createTextColumn(EntityKey.NAME, ColumnLabel.NAME, Tag),
    createCustomColumn(EntityKey.ROLE, ColumnLabel.ROLE, Shield, (val) => {
      const roleStr = String(val || "")
      return <RolePill role={roleStr} className="px-2 py-0.5 text-xs" />
    }),
  ]
}
