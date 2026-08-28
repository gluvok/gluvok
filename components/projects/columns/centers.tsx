/**
 * @file components/projects/columns/centers.tsx
 * @description Column definitions and rendering helpers for the Centers entity table.
 */

import { type ColumnDef, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { Tag } from "lucide-react";
import { ColumnLabel } from "@/lib/constants/enums";
import { createTextColumn } from "./helpers";

export function getCentersColumns<T extends RowData>(): ColumnDef<ProjectTableFeatures, T>[] {
  return [createTextColumn("name", ColumnLabel.NAME, Tag)];
}
