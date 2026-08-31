/**
 * @file lib/fields/helpers.ts
 * @description Helper definitions or configuration for entity table fields.
 */

import {
  ProjectSlug,
  Role,
  WeighmentType,
  EntryType,
  EntryStatus,
  FieldType,
} from "@/lib/constants/enums";
import {
  Sprout,
  Wheat,
  Droplet,
  Hammer,
  Package,
  Leaf,
  Wine,
  Cable,
  ShieldCheck,
  Briefcase,
  HardHat,
  User,
  Shield,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  SlidersHorizontal,
  PenTool,
  Cpu,
  Bot,
  Pencil,
  type LucideIcon,
} from "lucide-react";

export function getPrimaryIdKey(_slug?: string | ProjectSlug): string {
  return "id";
}

export function getReferencedEntitySlug(key: string): string | null {
  switch (key) {
    case "commodity_id":
    case "commodity_name":
      return ProjectSlug.COMMODITIES;
    case "rate_id":
      return ProjectSlug.RATES;
    case "center_id":
      return ProjectSlug.CENTERS;
    case "customer_id":
      return ProjectSlug.CUSTOMERS;
    case "user_id":
      return ProjectSlug.USERS;
    default:
      return null;
  }
}

export function isCommoditySlug(slug: string | ProjectSlug): boolean {
  return slug === ProjectSlug.COMMODITIES;
}

const COMMODITY_ICON_MAP: Record<string, LucideIcon> = {
  Wheat: Wheat,
  Corn: Sprout,
  "Crude Oil": Droplet,
  "Scrap Copper": Hammer,
  Barley: Leaf,
  Wine: Wine,
  Cable: Cable,
};

export function getCommodityIcon(name: string): LucideIcon {
  if (!name) return Package;
  const baseName = name.split(" (ID:")[0].trim();
  return COMMODITY_ICON_MAP[baseName] ?? Package;
}

export function getRoleBadgeClass(role?: string): string {
  switch (role) {
    case Role.ADMIN:
      return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30";
    case Role.MANAGER:
      return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
    case Role.OPERATOR:
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case Role.BASE:
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case Role.HARDWARE:
      return "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30";
    default:
      return "bg-muted/70 text-foreground border-border/40";
  }
}

export function getRoleIndicatorVariant(role?: string): "success" | "warning" | "error" | "info" {
  switch (role) {
    case Role.ADMIN:
    case Role.MANAGER:
      return "info";
    case Role.OPERATOR:
      return "warning";
    case Role.BASE:
    case Role.HARDWARE:
      return "success";
    default:
      return "info";
  }
}

export function getRoleIcon(role?: string): LucideIcon {
  switch (role) {
    case Role.ADMIN:
      return ShieldCheck;
    case Role.MANAGER:
      return Briefcase;
    case Role.OPERATOR:
      return HardHat;
    case Role.BASE:
      return User;
    case Role.HARDWARE:
      return Bot;
    default:
      return Shield;
  }
}

export function getTypeIcon(typeVal?: string): LucideIcon {
  if (!typeVal || typeVal === "all") return SlidersHorizontal;
  const normalized = typeVal.toLowerCase().trim();
  switch (normalized) {
    case WeighmentType.IN:
      return ArrowDownLeft;
    case WeighmentType.OUT:
      return ArrowUpRight;
    case WeighmentType.UNASSIGNED:
      return HelpCircle;
    case EntryType.MANUAL:
    case "manual":
      return PenTool;
    case EntryType.AUTOMATIC:
    case "automatic":
      return Cpu;
    default:
      return SlidersHorizontal;
  }
}

export function getStatusIcon(statusVal?: string): LucideIcon {
  if (!statusVal || statusVal === "all") return SlidersHorizontal;
  const normalized = statusVal.toLowerCase().trim();
  switch (normalized) {
    case EntryStatus.PENDING:
    case "pending":
      return Clock;
    case EntryStatus.APPROVED:
    case "approved":
      return CheckCircle2;
    case EntryStatus.REJECTED:
    case "rejected":
      return XCircle;
    default:
      return SlidersHorizontal;
  }
}

export function getAutoApproveIcon(val?: string): LucideIcon {
  if (!val || val === "all") return ShieldCheck;
  const normalized = val.toLowerCase().trim();
  if (normalized === "true" || normalized === "auto approved" || normalized === "enabled") {
    return CheckCircle2;
  }
  if (normalized === "false" || normalized === "manual" || normalized === "disabled") {
    return XCircle;
  }
  return ShieldCheck;
}

export function getEditedIcon(val?: string): LucideIcon {
  if (!val || val === "all") return Pencil;
  const normalized = val.toLowerCase().trim();
  if (normalized === "true" || normalized === "edited") {
    return CheckCircle2;
  }
  if (normalized === "false" || normalized === "original") {
    return XCircle;
  }
  return Pencil;
}

export function getItemIcon(type: string | ProjectSlug, label: string): LucideIcon | null {
  switch (type) {
    case ProjectSlug.COMMODITIES:
      return getCommodityIcon(label);
    case "role":
    case "roles":
      return getRoleIcon(label);
    case "type":
    case "types":
      return getTypeIcon(label);
    case "status":
    case "statuses":
    case "entry_status":
    case FieldType.ENTRY_STATUS:
      return getStatusIcon(label);
    case "auto_approved":
    case "auto_approve":
      return getAutoApproveIcon(label);
    case "edited":
      return getEditedIcon(label);
    default:
      return null;
  }
}

export function getSelectPlaceholder(entity: string): string {
  return `Select ${entity.toLowerCase()}...`;
}

export function getSingularName(name: string): string {
  switch (name) {
    case "Centers":
      return "Center";
    case "Commodities":
      return "Commodity";
    case "Rates":
      return "Rate";
    case "Customers":
      return "Customer";
    case "Weighments":
      return "Weighment";
    case "Factories":
      return "Factory";
    case "Users":
      return "User";
    case "Entries":
      return "Entry";

    default:
      if (name.endsWith("ies")) {
        return name.slice(0, -3) + "y";
      }
      if (name.endsWith("s")) {
        return name.slice(0, -1);
      }
      return name;
  }
}
