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
  UserCheck,
  Clock,
  PenLine,
  CheckCircle2,
  XCircle,
  Activity,
} from "lucide-react";
import { EntryStatus, EntrySource } from "@/lib/constants/enums";
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
    createCustomColumn("source", "Source", Sliders, (val) => {
      const source = String(val || EntrySource.DEVICE).toLowerCase();
      let sourceClass = "bg-muted text-muted-foreground border border-border";
      const Icon = source === EntrySource.DEVICE ? Cpu : User;
      if (source === EntrySource.DEVICE) {
        sourceClass =
          "bg-purple-50 text-purple-700 border border-purple-200/50 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800/30";
      } else if (source === EntrySource.MANUAL) {
        sourceClass =
          "bg-blue-50 text-blue-700 border border-blue-200/50 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/30";
      }
      return (
        <span
          className={cn(badgeBaseClass, "capitalize inline-flex items-center gap-1.5", sourceClass)}
        >
          <Icon className="h-3 w-3 shrink-0" />
          {source}
        </span>
      );
    }),
    createTextColumn("vehicle_number", "Vehicle Number", Car),
    createBaseColumn("weight", "Weight", Weight, ({ row }) => {
      const val = row.getValue("weight") as number;
      return <div className="font-mono text-xs font-semibold text-foreground">{val}</div>;
    }),
    createCustomColumn("status", "Status", Activity, (val) => {
      const status = String(val).toLowerCase();
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
        <span
          className={cn(badgeBaseClass, "capitalize inline-flex items-center gap-1.5", statusClass)}
        >
          <Icon className="h-3 w-3 shrink-0" />
          {status}
        </span>
      );
    }),
    createCustomColumn("auto_approved", "Verification", ShieldCheck, (val, row) => {
      const isAuto = val === true || val === "true";
      const rec = row as Record<string, unknown>;
      const source = String(rec.source || "").toLowerCase();
      const status = String(rec.status || "").toLowerCase();

      if (isAuto) {
        return (
          <span
            className={cn(
              badgeBaseClass,
              "inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200/50 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800/30",
            )}
          >
            <CheckCircle2 className="h-3 w-3 shrink-0 text-purple-600 dark:text-purple-400" />
            System Approved
          </span>
        );
      }

      if (source === EntrySource.DEVICE) {
        if (status === EntryStatus.PENDING) {
          return (
            <span
              className={cn(
                badgeBaseClass,
                "inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200/50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/30",
              )}
            >
              <Clock className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
              Review Required
            </span>
          );
        }
        if (status === EntryStatus.APPROVED) {
          return (
            <span
              className={cn(
                badgeBaseClass,
                "inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/30",
              )}
            >
              <UserCheck className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
              User Approved
            </span>
          );
        }
        if (status === EntryStatus.REJECTED) {
          return (
            <span
              className={cn(
                badgeBaseClass,
                "inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200/50 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/30",
              )}
            >
              <XCircle className="h-3 w-3 shrink-0 text-rose-600 dark:text-rose-400" />
              Rejected
            </span>
          );
        }
      }

      return (
        <span
          className={cn(
            badgeBaseClass,
            "inline-flex items-center gap-1.5 bg-muted text-muted-foreground border border-border",
          )}
        >
          <PenLine className="h-3 w-3 shrink-0 text-muted-foreground" />
          User Entry
        </span>
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
