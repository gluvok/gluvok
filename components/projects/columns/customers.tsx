/**
 * @file components/projects/columns/customers.tsx
 * @description Column definitions and rendering helpers for the Customers entity table.
 */

import { type ColumnDef, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { User, ShieldCheck, Tag, AtSign } from "lucide-react";
import { ColumnLabel } from "@/lib/constants/enums";
import { createTextColumn, createCustomColumn } from "./helpers";

export function getCustomersColumns<T extends RowData>(): ColumnDef<ProjectTableFeatures, T>[] {
  return [
    createTextColumn(
      "govt_id",
      ColumnLabel.GOVT_ID,
      ShieldCheck,
      "font-mono text-muted-foreground text-xs",
    ),
    createTextColumn("name", ColumnLabel.NAME, Tag),
    createTextColumn("father_name", ColumnLabel.FATHER_NAME, User, "text-muted-foreground text-xs"),
    createCustomColumn("username", ColumnLabel.USERNAME, AtSign, (_val, row) => {
      const rec = row as Record<string, unknown>;
      const u = (rec.username as string) || (rec.users as { username?: string } | null)?.username;
      if (!u) return <span className="text-muted-foreground/40 text-xs">—</span>;
      return <span className="font-mono text-xs text-muted-foreground">@{u}</span>;
    }),
  ];
}
