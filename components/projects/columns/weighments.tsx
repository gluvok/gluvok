/**
 * @file components/projects/columns/weighments.tsx
 * @description Column definitions and rendering helpers for the Weighments entity table.
 */

import { type ColumnDef, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import {
  Tag,
  Weight,
  Ruler,
  Image,
  Building,
  User,
  Users,
  Clock,
  ArrowLeftRight,
} from "lucide-react";
import { ColumnLabel, WeighmentType } from "@/lib/constants/enums";
import { getTypeIcon } from "@/lib/fields/helpers";
import { cn, formatDateTime } from "@/lib/utils";
import {
  createTextColumn,
  createBaseColumn,
  createCustomColumn,
  createIdColumn,
  badgeBaseClass,
} from "./helpers";
import { WeighmentImagesCell } from "./weighments-cell";

export function getWeighmentsColumns<T extends RowData>(): ColumnDef<ProjectTableFeatures, T>[] {
  return [
    createTextColumn("unit", ColumnLabel.UNIT, Ruler),
    createCustomColumn("type", ColumnLabel.TYPE, ArrowLeftRight, (val) => {
      const type = ((val as string) || WeighmentType.UNASSIGNED).toLowerCase();
      let typeClass = "bg-muted text-muted-foreground border border-border";
      const Icon = getTypeIcon(type);

      if (type === WeighmentType.IN) {
        typeClass =
          "bg-emerald-50 text-emerald-700 border border-emerald-200/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/30";
      } else if (type === WeighmentType.OUT) {
        typeClass =
          "bg-indigo-50 text-indigo-700 border border-indigo-200/50 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800/30";
      } else if (type === WeighmentType.UNASSIGNED) {
        typeClass =
          "bg-amber-50 text-amber-700 border border-amber-200/50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/30";
      }

      return (
        <span
          className={cn(badgeBaseClass, "capitalize inline-flex items-center gap-1.5", typeClass)}
        >
          <Icon className="h-3 w-3 shrink-0" />
          {type}
        </span>
      );
    }),
    createBaseColumn("gross_weight", ColumnLabel.GROSS_WEIGHT, Weight, ({ row }) => {
      const val = row.getValue("gross_weight") as number;
      return (
        <div className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {val}
        </div>
      );
    }),
    createBaseColumn("tare_weight", ColumnLabel.TARE_WEIGHT, Weight, ({ row }) => {
      const val = row.getValue("tare_weight") as number;
      return (
        <div className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
          {val}
        </div>
      );
    }),
    createBaseColumn("net_weight", ColumnLabel.NET_WEIGHT, Weight, ({ row }) => {
      const val = row.getValue("net_weight") as number;
      return (
        <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{val}</div>
      );
    }),
    {
      ...createBaseColumn("images", ColumnLabel.IMAGES, Image, ({ row }) => {
        const images = row.getValue("images") as string[] | undefined;
        const vehicleNumber =
          ((row.original as Record<string, unknown>)?.vehicle_number as string) || "Weighment";
        return <WeighmentImagesCell images={images} vehicleNumber={vehicleNumber} />;
      }),
      enableGlobalFilter: false,
      enableSorting: false,
    },
    createIdColumn("in_entry_id", ColumnLabel.IN_ENTRY_ID, Tag),
    createCustomColumn("in_entry_created_at", ColumnLabel.IN_ENTRY_CREATED_AT, Clock, (val) => (
      <span className="font-mono text-muted-foreground text-xs">{formatDateTime(val)}</span>
    )),
    createIdColumn("out_entry_id", ColumnLabel.OUT_ENTRY_ID, Tag),
    createCustomColumn("out_entry_created_at", ColumnLabel.OUT_ENTRY_CREATED_AT, Clock, (val) => (
      <span className="font-mono text-muted-foreground text-xs">{formatDateTime(val)}</span>
    )),
    createIdColumn("in_center_id", ColumnLabel.IN_CENTER_ID, Building),
    createTextColumn("in_center_name", ColumnLabel.IN_CENTER_NAME, Building),
    createIdColumn("out_center_id", ColumnLabel.OUT_CENTER_ID, Building),
    createTextColumn("out_center_name", ColumnLabel.OUT_CENTER_NAME, Building),
    createIdColumn("in_user_id", ColumnLabel.IN_USER_ID, User),
    createTextColumn("in_user_name", ColumnLabel.IN_USER_NAME, User),
    createIdColumn("out_user_id", ColumnLabel.OUT_USER_ID, User),
    createTextColumn("out_user_name", ColumnLabel.OUT_USER_NAME, User),
    createIdColumn("in_customer_id", ColumnLabel.IN_CUSTOMER_ID, Users),
    createTextColumn("in_customer_name", ColumnLabel.IN_CUSTOMER_NAME, Users),
    createIdColumn("out_customer_id", ColumnLabel.OUT_CUSTOMER_ID, Users),
    createTextColumn("out_customer_name", ColumnLabel.OUT_CUSTOMER_NAME, Users),
  ];
}
