/**
 * @file components/projects/columns/entries.tsx
 * @description Column definitions and rendering helpers for the Entries entity table.
 */

import { type ColumnDef, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import {
  Car,
  Weight,
  Building,
  User,
  Users,
  Image,
  ShieldCheck,
  Sliders,
  Cpu,
  PenTool,
} from "lucide-react";
import { EntryStatus, EntryType } from "@/lib/constants/enums";
import { getStatusIcon } from "@/lib/fields";
import { cn } from "@/lib/utils";
import {
  createTextColumn,
  createBaseColumn,
  createCustomColumn,
  createIdColumn,
  badgeBaseClass,
} from "./helpers";
import { WeighmentImagesCell } from "./weighments-cell";

export function getEntriesColumns<T extends RowData>(): ColumnDef<ProjectTableFeatures, T>[] {
  return [
    createCustomColumn("type", "Type", Sliders, (val) => {
      const type = String(val || EntryType.AUTOMATIC).toLowerCase();
      let typeClass = "bg-muted text-muted-foreground border border-border";
      const Icon = type === EntryType.AUTOMATIC ? Cpu : PenTool;
      if (type === EntryType.AUTOMATIC) {
        typeClass =
          "bg-purple-50 text-purple-700 border border-purple-200/50 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800/30";
      } else if (type === EntryType.MANUAL) {
        typeClass =
          "bg-blue-50 text-blue-700 border border-blue-200/50 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/30";
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
    createTextColumn("vehicle_number", "Vehicle Number", Car),
    createBaseColumn("weight", "Weight", Weight, ({ row }) => {
      const val = row.getValue("weight") as number;
      return <div className="font-mono text-xs font-semibold text-foreground">{val}</div>;
    }),
    createCustomColumn("status", "Status", ShieldCheck, (val, row) => {
      const rec = row as Record<string, unknown>;
      const status = String(val).toLowerCase();
      const isAutoApproved = Boolean(rec.auto_approved);
      let statusClass = "bg-muted text-muted-foreground border border-border";
      const Icon = getStatusIcon(status);
      if (status === EntryStatus.APPROVED) {
        statusClass =
          "bg-emerald-50 text-emerald-700 border border-emerald-200/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/30";
      } else if (status === EntryStatus.PENDING) {
        statusClass =
          "bg-amber-50 text-amber-700 border border-amber-200/50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/30";
      } else if (status === EntryStatus.REJECTED) {
        statusClass =
          "bg-rose-50 text-rose-700 border border-rose-200/50 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/30";
      }
      return (
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              badgeBaseClass,
              "capitalize inline-flex items-center gap-1.5",
              statusClass,
            )}
          >
            <Icon className="h-3 w-3 shrink-0" />
            {status}
          </span>
          {isAutoApproved && (
            <span className="text-3xs font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200/60 dark:bg-purple-950/30 dark:text-purple-300">
              Auto
            </span>
          )}
        </div>
      );
    }),
    createIdColumn("center_id", "Center ID", Building),
    createCustomColumn("center_name", "Center Name", Building, (_val, row) => {
      const rec = row as Record<string, unknown>;
      const name =
        (rec.center_name as string) || (rec.centers as { name?: string } | undefined)?.name || "";
      return <div className="font-semibold text-foreground text-xs">{name || "—"}</div>;
    }),
    createIdColumn("user_id", "User ID", User),
    createCustomColumn("user_name", "User Name", User, (_val, row) => {
      const rec = row as Record<string, unknown>;
      const name =
        (rec.user_name as string) || (rec.users as { name?: string } | undefined)?.name || "";
      return <div className="font-semibold text-foreground text-xs">{name || "—"}</div>;
    }),
    createIdColumn("customer_id", "Customer ID", Users),
    createCustomColumn("customer_name", "Customer Name", Users, (_val, row) => {
      const rec = row as Record<string, unknown>;
      const name =
        (rec.customer_name as string) ||
        (rec.customers as { name?: string } | undefined)?.name ||
        "";
      return <div className="font-semibold text-foreground text-xs">{name || "—"}</div>;
    }),
    {
      ...createBaseColumn("images", "Images", Image, ({ row }) => {
        const images = row.getValue("images") as string[] | undefined;
        const vehicleNumber = row.getValue("vehicle_number") as string;
        return <WeighmentImagesCell images={images} vehicleNumber={vehicleNumber} />;
      }),
      enableGlobalFilter: false,
      enableSorting: false,
    },
  ];
}
