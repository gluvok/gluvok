/**
 * @file components/projects/columns/entries.tsx
 * @description Column definitions and rendering helpers for the Entries entity table.
 */

import { type ColumnDef, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import {
  Truck,
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
import {
  getStatusIcon,
  getSourceColorClass,
  getStatusColorClass,
  getVerificationColorClass,
} from "@/lib/fields";
import { cn } from "@/lib/utils";
import { createBaseColumn, createCustomColumn, createIdColumn, badgeBaseClass } from "./helpers";
import { WeighmentImagesCell } from "./weighments-cell";

export function getEntriesColumns<T extends RowData>(): ColumnDef<ProjectTableFeatures, T>[] {
  return [
    createCustomColumn("source", "Source", Sliders, (val) => {
      const source = String(val || EntrySource.DEVICE).toLowerCase();
      const Icon = source === EntrySource.DEVICE ? Cpu : User;
      return (
        <span className={cn(badgeBaseClass, "capitalize gap-1.5", getSourceColorClass(source))}>
          <Icon className="h-3 w-3 shrink-0" />
          {source}
        </span>
      );
    }),
    createCustomColumn("vehicle_number", "Vehicle Number", Truck, (val) => {
      const vn = String(val || "");
      if (!vn) return <span className="text-muted-foreground/40 text-xs">—</span>;
      return (
        <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
          {vn}
        </span>
      );
    }),
    createBaseColumn("weight", "Weight", Weight, ({ row }) => {
      const val = row.getValue("weight") as number;
      return (
        <div className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">{val}</div>
      );
    }),
    createCustomColumn("status", "Status", Activity, (val) => {
      const status = String(val).toLowerCase();
      const Icon = getStatusIcon(status);
      return (
        <span className={cn(badgeBaseClass, "capitalize gap-1.5", getStatusColorClass(status))}>
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
          <span className={cn(badgeBaseClass, "gap-1.5", getVerificationColorClass("true"))}>
            <CheckCircle2 className="h-3 w-3 shrink-0" />
            System Approved
          </span>
        );
      }

      if (source === EntrySource.DEVICE) {
        if (status === EntryStatus.PENDING) {
          return (
            <span
              className={cn(badgeBaseClass, "gap-1.5", getStatusColorClass(EntryStatus.PENDING))}
            >
              <Clock className="h-3 w-3 shrink-0" />
              Review Required
            </span>
          );
        }
        if (status === EntryStatus.APPROVED) {
          return (
            <span
              className={cn(badgeBaseClass, "gap-1.5", getStatusColorClass(EntryStatus.APPROVED))}
            >
              <UserCheck className="h-3 w-3 shrink-0" />
              User Approved
            </span>
          );
        }
        if (status === EntryStatus.REJECTED) {
          return (
            <span
              className={cn(badgeBaseClass, "gap-1.5", getStatusColorClass(EntryStatus.REJECTED))}
            >
              <XCircle className="h-3 w-3 shrink-0" />
              Rejected
            </span>
          );
        }
      }

      return (
        <span className={cn(badgeBaseClass, "gap-1.5", getVerificationColorClass("false"))}>
          <PenLine className="h-3 w-3 shrink-0" />
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
