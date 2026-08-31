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
    createTextColumn("name", "Name", Tag),
    createTextColumn("father_name", "Father's Name", User, "text-muted-foreground text-xs"),
    createCustomColumn("username", "Username", AtSign, (_val, row) => {
      const rec = row as Record<string, unknown>;
      const u = (rec.username as string) || (rec.users as { username?: string } | null)?.username;
      if (!u) return <span className="text-muted-foreground/40 text-xs">—</span>;
      return <span className="font-mono text-xs text-muted-foreground">@{u}</span>;
    }),
  ];
}
