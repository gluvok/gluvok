/**
 * @file components/projects/columns/users.tsx
 * @description Column definitions and rendering helpers for the Users entity table.
 */

import { type ColumnDef, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { Tag, Shield, AtSign } from "lucide-react";
import { getRoleIcon } from "@/lib/fields/helpers";
import { RenderRoleIcon } from "@/components/sidebar/nav/user-info";
import { createTextColumn, createCustomColumn, badgeBaseClass } from "./helpers";
import { cn } from "@/lib/utils";

export function getUsersColumns<T extends RowData>(): ColumnDef<ProjectTableFeatures, T>[] {
  return [
    createTextColumn("name", "Name", Tag),
    createCustomColumn("username", "Username", AtSign, (val) => {
      const u = String(val || "");
      if (!u) return <span className="text-muted-foreground/40 text-xs">—</span>;
      return (
        <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
          @{u}
        </span>
      );
    }),
    createCustomColumn("role", "Role", Shield, (val) => {
      const roleStr = String(val || "");
      return (
        <span className={cn(badgeBaseClass, "capitalize gap-1.5")}>
          <RenderRoleIcon
            icon={getRoleIcon(roleStr)}
            className="size-3 shrink-0"
          />
          {roleStr}
        </span>
      );
    }),
  ];
}
