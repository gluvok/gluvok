/**
 * @file components/projects/columns/customers.tsx
 * @description Column definitions and rendering helpers for the Customers entity table.
 */

import { type ColumnDef, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { User, Tag, AtSign } from "lucide-react";
import { createTextColumn, createCustomColumn } from "./helpers";

export function getCustomersColumns<T extends RowData>(): ColumnDef<ProjectTableFeatures, T>[] {
  return [
    createCustomColumn<T>("name", "Name", Tag, (val) => (
      <div className="flex items-center gap-1.5">
        <User className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
        <span className="font-semibold text-foreground text-xs">{String(val ?? "")}</span>
      </div>
    )),
    createTextColumn("father_name", "Father's Name", User, "text-muted-foreground text-xs"),
    createCustomColumn("username", "Username", AtSign, (_val, row) => {
      const rec = row as Record<string, unknown>;
      const u = (rec.username as string) || (rec.users as { username?: string } | null)?.username;
      if (!u) return <span className="text-muted-foreground/40 text-xs">—</span>;
      return (
        <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/50 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-800/30">
          @{u}
        </span>
      );
    }),
  ];
}
