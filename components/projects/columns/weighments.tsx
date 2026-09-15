/**
 * @file components/projects/columns/weighments.tsx
 * @description Column definitions and rendering helpers for the Weighments entity table.
 */

import { type ColumnDef, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import {
  Tag,
  Weight,
  Truck,
  PackageCheck,
  Ruler,
  Image,
  Building,
  User,
  Users,
  Clock,
  ArrowLeftRight,
  IndianRupee,
} from "lucide-react";
import { WeighmentType } from "@/lib/constants/enums";
import {
  getTypeIcon,
  getTypeColorClass,
  getUnitIcon,
  getUnitColorClass,
} from "@/lib/fields/helpers";
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
    createCustomColumn("vehicle_number", "Vehicle Number", Truck, (val) => {
      const vn = String(val || "");
      if (!vn) return <span className="text-muted-foreground/40 text-xs">—</span>;
      return (
        <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
          {vn}
        </span>
      );
    }),
    createCustomColumn("unit", "Unit", Ruler, (val) => {
      const unit = String(val || "");
      const Icon = getUnitIcon(unit);
      return (
        <span className={cn(badgeBaseClass, "tracking-wide gap-1.5", getUnitColorClass(unit))}>
          <Icon className="h-3 w-3 shrink-0" />
          {unit}
        </span>
      );
    }),
    createIdColumn("rate_id", "Rate ID", IndianRupee),
    createCustomColumn("type", "Type", ArrowLeftRight, (val) => {
      const type = ((val as string) || WeighmentType.UNASSIGNED).toLowerCase();
      const Icon = getTypeIcon(type);

      return (
        <span className={cn(badgeBaseClass, "capitalize gap-1.5", getTypeColorClass(type))}>
          <Icon className="h-3 w-3 shrink-0" />
          {type}
        </span>
      );
    }),
    createBaseColumn("gross_weight", "Gross Weight", Weight, ({ row }) => {
      const val = row.getValue("gross_weight") as number;
      return (
        <div className="font-mono text-xs font-semibold text-sky-600 dark:text-sky-400">{val}</div>
      );
    }),
    createBaseColumn("tare_weight", "Tare Weight", Truck, ({ row }) => {
      const val = row.getValue("tare_weight") as number;
      return (
        <div className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
          {val}
        </div>
      );
    }),
    createBaseColumn("net_weight", "Net Weight", PackageCheck, ({ row }) => {
      const val = row.getValue("net_weight") as number;
      return (
        <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
          {val}
        </div>
      );
    }),
    {
      ...createBaseColumn("images", "Images", Image, ({ row }) => {
        const images = row.getValue("images") as string[] | undefined;
        const vehicleNumber =
          ((row.original as Record<string, unknown>)?.vehicle_number as string) || "Weighment";
        return <WeighmentImagesCell images={images} vehicleNumber={vehicleNumber} />;
      }),
      enableGlobalFilter: false,
      enableSorting: false,
    },
    createIdColumn("in_entry_id", "In-Entry ID", Tag),
    createCustomColumn("in_entry_created_at", "In-Entry Time", Clock, (val) => (
      <span className="font-mono text-muted-foreground text-xs">{formatDateTime(val)}</span>
    )),
    createIdColumn("out_entry_id", "Out-Entry ID", Tag),
    createCustomColumn("out_entry_created_at", "Out-Entry Time", Clock, (val) => (
      <span className="font-mono text-muted-foreground text-xs">{formatDateTime(val)}</span>
    )),
    createIdColumn("in_center_id", "In-Center ID", Building),
    createTextColumn("in_center_name", "In-Center Name", Building),
    createIdColumn("out_center_id", "Out-Center ID", Building),
    createTextColumn("out_center_name", "Out-Center Name", Building),
    createIdColumn("in_user_id", "In-User ID", User),
    createTextColumn("in_user_name", "In-User Name", User),
    createIdColumn("out_user_id", "Out-User ID", User),
    createTextColumn("out_user_name", "Out-User Name", User),
    createIdColumn("in_customer_id", "In-Customer ID", Users),
    createTextColumn("in_customer_name", "In-Customer Name", Users),
    createIdColumn("out_customer_id", "Out-Customer ID", Users),
    createTextColumn("out_customer_name", "Out-Customer Name", Users),
  ];
}
