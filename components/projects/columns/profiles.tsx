/**
 * @file components/projects/columns/profiles.tsx
 * @description Column definitions and rendering helpers for the Profiles entity table.
 */

import { ColumnDef } from "@tanstack/react-table"
import { Fingerprint, Tag, Shield, AtSign } from "lucide-react"
import { EntityKey, ColumnLabel } from "@/lib/constants/enums"
import { getRoleIcon } from "@/lib/fields/helpers";
import { RenderRoleIcon } from "@/components/sidebar/nav/user-info"
import { createTextColumn, createCustomColumn } from "./helpers"

export function getProfilesColumns<T>(): ColumnDef<T>[] {
  return [
    createTextColumn(EntityKey.AADHAR_NUMBER, ColumnLabel.AADHAR_NUMBER, Fingerprint, "font-mono text-muted-foreground text-xs"),
    createTextColumn(EntityKey.NAME, ColumnLabel.NAME, Tag),
    createCustomColumn(
      EntityKey.USERNAME,
      ColumnLabel.USERNAME,
      AtSign,
      (_val, row) => {
        const rec = row as Record<string, unknown>
        const u = (rec[EntityKey.USERNAME] as string) || (rec.users as { username?: string } | null)?.username
        if (!u) return <span className="text-muted-foreground/40 text-xs">—</span>
        return <span className="font-mono text-xs text-muted-foreground">@{u}</span>
      }
    ),
    createCustomColumn(EntityKey.ROLE, ColumnLabel.ROLE, Shield, (val) => {
      const roleStr = String(val || "")
      return (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <RenderRoleIcon
            icon={getRoleIcon(roleStr)}
            className="size-3.5 shrink-0"
          />
          <span>{roleStr}</span>
        </div>
      );
    }),
  ]
}
