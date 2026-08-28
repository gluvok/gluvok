/**
 * @file components/projects/columns/system.tsx
 * @description Column definitions and rendering helpers for the System entity table.
 */

import { type ColumnDef, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import {
  ShieldCheck,
  Hash,
  Calendar,
  CalendarClock,
  Fingerprint,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { ColumnLabel } from "@/lib/constants/enums";
import { formatDateTime } from "@/lib/utils";
import { createCustomColumn } from "./helpers";
import { getCommodityIcon } from "@/lib/fields";

interface PrimaryKeyConfig {
  label: ColumnLabel;
  icon: LucideIcon;
  renderCell: (val: string) => React.ReactNode;
}

const renderTextCell = (val: string) => (
  <div className="font-mono text-muted-foreground text-xs">{val}</div>
);

const PRIMARY_KEY_CONFIGS: Record<string, PrimaryKeyConfig> = {
  govt_id: {
    label: ColumnLabel.GOVT_ID,
    icon: ShieldCheck,
    renderCell: (val) => renderTextCell(val),
  },
  aadhar_number: {
    label: ColumnLabel.AADHAR_NUMBER,
    icon: Fingerprint,
    renderCell: (val) => renderTextCell(val),
  },
  name: {
    label: ColumnLabel.NAME,
    icon: Tag,
    renderCell: (val) => {
      const Icon = getCommodityIcon(val);
      return (
        <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
          <Icon className="h-3.5 w-3.5 text-muted-foreground/75" />
          {val}
        </div>
      );
    },
  },
  id: {
    label: ColumnLabel.ID,
    icon: Hash,
    renderCell: (val) => renderTextCell(val),
  },
};

export function getSystemColumns<T extends RowData>(
  primaryIdKey: string,
): ColumnDef<ProjectTableFeatures, T>[] {
  const config = PRIMARY_KEY_CONFIGS[primaryIdKey] || PRIMARY_KEY_CONFIGS.id;

  return [
    createCustomColumn<T>(primaryIdKey, config.label, config.icon, config.renderCell),
    {
      ...createCustomColumn<T>("created_at", ColumnLabel.CREATED_AT, Calendar, (val) => (
        <span className="text-muted-foreground text-xs font-medium">{formatDateTime(val)}</span>
      )),
      enableGlobalFilter: false,
    },
    {
      ...createCustomColumn<T>("updated_at", ColumnLabel.UPDATED_AT, CalendarClock, (val) => (
        <span className="text-muted-foreground text-xs font-medium">{formatDateTime(val)}</span>
      )),
      enableGlobalFilter: false,
    },
  ];
}
