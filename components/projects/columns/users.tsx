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
import { Role } from "@/lib/constants/enums";

function getRoleBadgeClass(role: string): string {
  switch (role) {
    case Role.ADMIN:
      return "bg-rose-50 text-rose-700 border border-rose-200/50 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/30";
    case Role.MANAGER:
      return "bg-violet-50 text-violet-700 border border-violet-200/50 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800/30";
    case Role.OPERATOR:
      return "bg-amber-50 text-amber-700 border border-amber-200/50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/30";
    case Role.BASE:
      return "bg-sky-50 text-sky-700 border border-sky-200/50 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800/30";
    case Role.HARDWARE:
      return "bg-purple-50 text-purple-700 border border-purple-200/50 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800/30";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}

export function getUsersColumns<T extends RowData>(): ColumnDef<ProjectTableFeatures, T>[] {
  return [
    createTextColumn("name", "Name", Tag),
    createCustomColumn("username", "Username", AtSign, (val) => {
      const u = String(val || "");
      if (!u) return <span className="text-muted-foreground/40 text-xs">—</span>;
      return (
        <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/50 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-800/30">
          @{u}
        </span>
      );
    }),
    createCustomColumn("role", "Role", Shield, (val) => {
      const roleStr = String(val || "");
      return (
        <span className={cn(badgeBaseClass, "capitalize inline-flex items-center gap-1.5", getRoleBadgeClass(roleStr))}>
          <RenderRoleIcon icon={getRoleIcon(roleStr)} className="size-3 shrink-0" />
          {roleStr}
        </span>
      );
    }),
  ];
}
