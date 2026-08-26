/**
 * @file components/projects/columns/centers.tsx
 * @description Column definitions and rendering helpers for the Centers entity table.
 */

import { ColumnDef } from "@tanstack/react-table";
import { Tag } from "lucide-react";
import { EntityKey, ColumnLabel } from "@/lib/constants/enums";
import { createTextColumn } from "./helpers";

export function getCentersColumns<T>(): ColumnDef<T>[] {
  return [createTextColumn(EntityKey.NAME, ColumnLabel.NAME, Tag)];
}
