/**
 * @file lib/fields/helpers.ts
 * @description Helper definitions or configuration for entity table fields (helpers).
 */

import { ProjectSlug, EntityKey, CommodityName, ProjectName, SystemSlug, SingularEntityName, Role, RoleLabel, WeighmentType, FieldRequirementMode } from "@/lib/constants/enums"
import { Sprout, Wheat, Droplet, Hammer, Package, Leaf, Wine, Cable, Crown, ShieldCheck, Briefcase, HardHat, User, Cpu, Shield, ArrowDownLeft, ArrowUpRight, ArrowUpDown, CheckCircle2, HelpCircle, Ban, SlidersHorizontal, type LucideIcon } from "lucide-react"

export function getPrimaryIdKey(slug: string | ProjectSlug): EntityKey {
  switch (slug) {
    default:
      break
  }
  return EntityKey.ID
}

export function getReferencedEntitySlug(key: string | EntityKey): string | null {
  switch (key) {
    case EntityKey.FACTORY_ID:
      return ProjectSlug.FACTORIES
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

export function getRoleIcon(role?: string): LucideIcon {
  if (!role) return Shield
  const normalized = role.toLowerCase().replace(/[\s_-]+/g, "_").trim()
  switch (normalized) {
    case Role.SUPER_ADMIN:
    case RoleLabel.SUPER_ADMIN.toLowerCase().replace(/\s+/g, "_"):
      return Crown
    case Role.ADMIN:
    case RoleLabel.ADMIN.toLowerCase():
      return ShieldCheck
    case Role.MANAGER:
    case RoleLabel.MANAGER.toLowerCase():
      return Briefcase
    case Role.OPERATOR:
    case RoleLabel.OPERATOR.toLowerCase():
      return HardHat
    case Role.BASE:
    case RoleLabel.BASE.toLowerCase():
      return User
    case Role.HARDWARE:
    case RoleLabel.HARDWARE.toLowerCase():
      return Cpu
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
