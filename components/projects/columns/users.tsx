/**
 * @file components/projects/columns/users.tsx
 * @description Column definitions and rendering helpers for the Users entity table.
 */

import { type ColumnDef, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { Tag, Shield, AtSign } from "lucide-react";
import { getRoleIcon } from "@/lib/fields/helpers";
import { RenderRoleIcon } from "@/components/sidebar/nav/user-info";
import { createTextColumn, createCustomColumn } from "./helpers";

export function getUsersColumns<T extends RowData>(): ColumnDef<ProjectTableFeatures, T>[] {
  return [
    createTextColumn("name", "Name", Tag),
    createCustomColumn("username", "Username", AtSign, (val) => {
      const u = String(val || "");
      if (!u) return <span className="text-muted-foreground/40 text-xs">—</span>;
      return <span className="font-mono text-xs text-muted-foreground">@{u}</span>;
    }),
    createCustomColumn("role", "Role", Shield, (val) => {
      const roleStr = String(val || "");
      return (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <RenderRoleIcon icon={getRoleIcon(roleStr)} className="size-3.5 shrink-0" />
          <span>{roleStr}</span>
        </div>
      );
    }),
  ];
}
