/**
 * @file components/projects/columns/customers.tsx
 * @description Column definitions and rendering helpers for the Customers entity table.
 */

import { ColumnDef } from "@tanstack/react-table";
import { User, ShieldCheck, Tag, AtSign } from "lucide-react";
import { EntityKey, ColumnLabel } from "@/lib/constants/enums";
import { createTextColumn, createCustomColumn } from "./helpers";

export function getCustomersColumns<T>(): ColumnDef<T>[] {
  return [
    createTextColumn(
      EntityKey.GOVT_ID,
      ColumnLabel.GOVT_ID,
      ShieldCheck,
      "font-mono text-muted-foreground text-xs",
    ),
    createTextColumn(EntityKey.NAME, ColumnLabel.NAME, Tag),
    createTextColumn(
      EntityKey.FATHER_NAME,
      ColumnLabel.FATHER_NAME,
      User,
      "text-muted-foreground text-xs",
    ),
    createCustomColumn(EntityKey.USERNAME, ColumnLabel.USERNAME, AtSign, (_val, row) => {
      const rec = row as Record<string, unknown>;
      const u =
        (rec[EntityKey.USERNAME] as string) ||
        (rec.users as { username?: string } | null)?.username;
      if (!u) return <span className="text-muted-foreground/40 text-xs">—</span>;
      return <span className="font-mono text-xs text-muted-foreground">@{u}</span>;
    }),
  ];
}
