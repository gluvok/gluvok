"use client";

/**
 * @file components/projects/toolbar/filter-chips.tsx
 * @description Active filter chips with formatting helpers, icons, and removal actions for ProjectToolbar.
 */

import * as React from "react";
import { type ColumnFilter } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  X,
  ListFilter,
  Calendar,
  Building,
  UserCog,
  Users,
  Tag,
  IndianRupee,
  Truck,
} from "lucide-react";
import { format } from "date-fns";
import {
  getRoleIcon,
  getSourceIcon,
  getStatusIcon,
  getTypeIcon,
  getUnitIcon,
  getAutoApproveIcon,
} from "@/lib/fields";

function formatSafeDate(dateStr: string, dateFormat = "LLL dd, yyyy"): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return format(d, dateFormat);
  } catch {
    return dateStr;
  }
}

function formatFilterChipLabel(id: string, value: unknown): string {
  const valStr = String(value);
  if (id === "auto_approved") {
    return `Verification: ${valStr === "true" ? "System Approved" : "User Review"}`;
  }
  if (id === "auto_approve") {
    return `Auto Approve: ${valStr === "true" ? "Enabled" : "Disabled"}`;
  }
  if (id === "created_at" || id === "updated_at") {
    return `Date: ${formatSafeDate(valStr)}`;
  }
  if (id === "source" || id === "status" || id === "type") {
    return `${id.charAt(0).toUpperCase() + id.slice(1)}: ${valStr.charAt(0).toUpperCase() + valStr.slice(1)}`;
  }

  const formattedId = id
    .replace(/_/g, " ")
    .replace(/\bid\b/gi, "")
    .trim();
  const capitalizedId = formattedId
    ? formattedId.charAt(0).toUpperCase() + formattedId.slice(1)
    : id;

  if (valStr === "true") return `${capitalizedId}: Yes`;
  if (valStr === "false") return `${capitalizedId}: No`;
  return `${capitalizedId}: ${valStr}`;
}

function getFilterChipIcon(
  id: string,
  value?: unknown,
): React.ComponentType<{ className?: string }> {
  if (
    id === "date_range" ||
    id === "start_date" ||
    id === "end_date" ||
    id === "created_at" ||
    id === "updated_at"
  ) {
    return Calendar;
  }
  if (
    id === "center_id" ||
    id === "center_name" ||
    id === "in_center_id" ||
    id === "in_center_name" ||
    id === "out_center_id" ||
    id === "out_center_name"
  ) {
    return Building;
  }
  if (
    id === "user_id" ||
    id === "user_name" ||
    id === "in_user_id" ||
    id === "in_user_name" ||
    id === "out_user_id" ||
    id === "out_user_name"
  ) {
    return UserCog;
  }
  if (id === "customer_id" || id === "customer_name") {
    return Users;
  }
  if (id === "commodity_id" || id === "commodity_name") {
    return Tag;
  }
  if (id === "rate_id") {
    return IndianRupee;
  }
  if (id === "role") {
    return getRoleIcon(String(value || ""));
  }
  if (id === "source") {
    return getSourceIcon(String(value || ""));
  }
  if (id === "status") {
    return getStatusIcon(String(value || ""));
  }
  if (id === "type") {
    return getTypeIcon(String(value || ""));
  }
  if (id === "unit") {
    return getUnitIcon(String(value || ""));
  }
  if (id === "auto_approved" || id === "auto_approve") {
    return getAutoApproveIcon(String(value || ""));
  }
  if (id === "vehicle_number" || id === "detected_vehicle_number") {
    return Truck;
  }
  return ListFilter;
}

interface FilterChipsProps {
  columnFilters: ColumnFilter[];
  setColumnFilters: (updater: (prev: ColumnFilter[]) => ColumnFilter[]) => void;
  onResetAll: () => void;
}

export function FilterChips({ columnFilters, setColumnFilters, onResetAll }: FilterChipsProps) {
  if (columnFilters.length === 0) return null;

  const hasStartDate = columnFilters.find((f) => f.id === "start_date");
  const hasEndDate = columnFilters.find((f) => f.id === "end_date");
  const chips: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onRemove: () => void;
  }[] = [];

  if (hasStartDate && hasEndDate) {
    const fromStr = formatSafeDate(String(hasStartDate.value));
    const toStr = formatSafeDate(String(hasEndDate.value));
    chips.push({
      id: "date_range",
      label: `Date: ${fromStr} – ${toStr}`,
      icon: Calendar,
      onRemove: () => {
        setColumnFilters((prev) =>
          prev.filter((f) => f.id !== "start_date" && f.id !== "end_date"),
        );
      },
    });
  } else if (hasStartDate) {
    chips.push({
      id: "start_date",
      label: `From: ${formatSafeDate(String(hasStartDate.value))}`,
      icon: Calendar,
      onRemove: () => {
        setColumnFilters((prev) => prev.filter((f) => f.id !== "start_date"));
      },
    });
  } else if (hasEndDate) {
    chips.push({
      id: "end_date",
      label: `To: ${formatSafeDate(String(hasEndDate.value))}`,
      icon: Calendar,
      onRemove: () => {
        setColumnFilters((prev) => prev.filter((f) => f.id !== "end_date"));
      },
    });
  }

  for (const filter of columnFilters) {
    if (filter.id === "start_date" || filter.id === "end_date") {
      continue;
    }
    chips.push({
      id: filter.id,
      label: formatFilterChipLabel(filter.id, filter.value),
      icon: getFilterChipIcon(filter.id, filter.value),
      onRemove: () => {
        setColumnFilters((prev) => prev.filter((f) => f.id !== filter.id));
      },
    });
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap text-xs pt-0.5">
      <span className="text-2xs font-medium text-muted-foreground mr-1">Active:</span>
      {chips.map((chip) => {
        const ChipIcon = chip.icon;
        return (
          <Badge
            key={chip.id}
            variant="secondary"
            className="h-6 gap-1.5 pl-2 pr-1 text-2xs font-medium bg-muted/80 hover:bg-muted text-foreground border border-border/60 transition-colors inline-flex items-center"
          >
            <ChipIcon className="h-3 w-3 text-muted-foreground shrink-0" />
            <span>{chip.label}</span>
            <button
              type="button"
              onClick={chip.onRemove}
              className="h-3.5 w-3.5 rounded-full hover:bg-foreground/10 flex items-center justify-center transition-colors ml-0.5"
              title={`Remove ${chip.id} filter`}
            >
              <X className="h-2.5 w-2.5 text-muted-foreground hover:text-foreground" />
            </button>
          </Badge>
        );
      })}
      <Button
        variant="ghost"
        size="sm"
        onClick={onResetAll}
        className="h-6 px-1.5 text-2xs text-muted-foreground hover:text-foreground hover:bg-transparent transition-colors underline underline-offset-2"
      >
        Reset
      </Button>
    </div>
  );
}
