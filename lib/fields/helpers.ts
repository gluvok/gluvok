/**
 * @file lib/fields/helpers.ts
 * @description Helper definitions or configuration for entity table fields (helpers).
 */

import {
  ProjectSlug,
  EntityKey,
  CommodityName,
  ProjectName,
  SystemSlug,
  SingularEntityName,
  Role,
  WeighmentType,
  FieldRequirementMode,
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
  ArrowUpDown,
  CheckCircle2,
  HelpCircle,
  Ban,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

export function getPrimaryIdKey(slug: string | ProjectSlug): EntityKey {
  switch (slug) {
    default:
      break
  }
  return EntityKey.ID
}

export function getReferencedEntitySlug(key: string | EntityKey): string | null {
  switch (key) {
    case EntityKey.COMMODITY_ID:
    case EntityKey.COMMODITY_NAME:
      return ProjectSlug.COMMODITIES
    case EntityKey.RATE_ID:
      return ProjectSlug.RATES
    case EntityKey.CENTER_ID:
      return ProjectSlug.CENTERS
    case EntityKey.PROFILE_ID:
      return ProjectSlug.PROFILES
    case EntityKey.CUSTOMER_ID:
      return ProjectSlug.CUSTOMERS
    case EntityKey.USER_ID:
      return SystemSlug.USERS
    default:
      return null
  }
}

export function isCommoditySlug(slug: string | ProjectSlug): boolean {
  return slug === ProjectSlug.COMMODITIES
}

const COMMODITY_ICON_MAP: Record<CommodityName, LucideIcon> = {
  [CommodityName.WHEAT]: Wheat,
  [CommodityName.CORN]: Sprout,
  [CommodityName.CRUDE_OIL]: Droplet,
  [CommodityName.SCRAP_COPPER]: Hammer,
  [CommodityName.BARLEY]: Leaf,
  [CommodityName.WINE]: Wine,
  [CommodityName.CABLE]: Cable,
}

export function getCommodityIcon(name: string): LucideIcon {
  if (!name) return Package
  const baseName = name.split(" (ID:")[0].trim()
  return COMMODITY_ICON_MAP[baseName as CommodityName] ?? Package
}

export function getRoleBadgeClass(role?: string): string {
  switch (role) {
    case Role.ADMIN:
      return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30"
    case Role.MANAGER:
      return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
    case Role.OPERATOR:
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
    case Role.BASE:
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    default:
      return "bg-muted/70 text-foreground border-border/40"
  }
}

export function getRoleIndicatorVariant(role?: string): "success" | "warning" | "error" | "info" {
  switch (role) {
    case Role.ADMIN:
    case Role.MANAGER:
      return "info"
    case Role.OPERATOR:
      return "warning"
    case Role.BASE:
      return "success";
    default:
      return "info"
  }
}

export function getRoleIcon(role?: string): LucideIcon {
  switch (role) {
    case Role.ADMIN:
      return ShieldCheck
    case Role.MANAGER:
      return Briefcase
    case Role.OPERATOR:
      return HardHat
    case Role.BASE:
      return User;
    default:
      return Shield
  }
}

export function getTypeIcon(typeVal?: string): LucideIcon {
  if (!typeVal) return ArrowUpDown
  const normalized = typeVal.toLowerCase().trim()
  switch (normalized) {
    case WeighmentType.IN:
      return ArrowDownLeft
    case WeighmentType.OUT:
      return ArrowUpRight
    default:
      return ArrowUpDown
  }
}

export function getModeIcon(modeVal?: string): LucideIcon {
  if (!modeVal) return SlidersHorizontal
  const normalized = modeVal.toLowerCase().trim()
  switch (normalized) {
    case FieldRequirementMode.MANDATORY:
    case "mandatory":
      return CheckCircle2
    case FieldRequirementMode.OPTIONAL:
    case "optional":
      return HelpCircle
    case FieldRequirementMode.NOT_REQUIRED:
    case "not required":
    case "not_required":
      return Ban
    default:
      return SlidersHorizontal
  }
}

export function getModeColorClass(modeVal?: string): string {
  if (!modeVal) return "text-muted-foreground"
  const normalized = modeVal.toLowerCase().trim()
  switch (normalized) {
    case FieldRequirementMode.MANDATORY:
    case "mandatory":
      return "text-emerald-600 dark:text-emerald-400"
    case FieldRequirementMode.OPTIONAL:
    case "optional":
      return "text-amber-500 dark:text-amber-400"
    case FieldRequirementMode.NOT_REQUIRED:
    case "not required":
    case "not_required":
      return "text-rose-500 dark:text-rose-400"
    default:
      return "text-muted-foreground"
  }
}

export function getFieldRequirementModeLabel(modeVal?: string): string {
  if (!modeVal) return "Optional"
  const normalized = modeVal.toLowerCase().trim()
  switch (normalized) {
    case FieldRequirementMode.MANDATORY:
    case "mandatory":
      return "Mandatory"
    case FieldRequirementMode.NOT_REQUIRED:
    case "not required":
    case "not_required":
      return "Not Required"
    case FieldRequirementMode.OPTIONAL:
    case "optional":
    default:
      return "Optional"
  }
}

export function getItemIcon(type: string | ProjectSlug, label: string): LucideIcon | null {
  switch (type) {
    case ProjectSlug.COMMODITIES:
      return getCommodityIcon(label)
    case "role":
    case "roles":
      return getRoleIcon(label)
    case "type":
    case "types":
      return getTypeIcon(label)
    case "mode":
    case "modes":
    case "field_requirement_mode":
      return getModeIcon(label)
    default:
      return null
  }
}

export function getSelectPlaceholder(entity: string): string {
  return `Select ${entity.toLowerCase()}...`
}

export function getSingularName(name: string): string {
  switch (name) {
    case ProjectName.CENTERS:
      return SingularEntityName.CENTER
    case ProjectName.COMMODITIES:
      return SingularEntityName.COMMODITY
    case ProjectName.RATES:
      return SingularEntityName.RATE
    case ProjectName.CUSTOMERS:
      return SingularEntityName.CUSTOMER
    case ProjectName.WEIGHMENTS:
      return SingularEntityName.WEIGHMENT
    case ProjectName.FACTORIES:
      return SingularEntityName.FACTORY
    case ProjectName.PROFILES:
      return SingularEntityName.PROFILE
    case ProjectName.CONFIGS:
      return SingularEntityName.CONFIG

    default:
      if (name.endsWith("ies")) {
        return name.slice(0, -3) + "y"
      }
      if (name.endsWith("s")) {
        return name.slice(0, -1)
      }
      return name
  }
}
