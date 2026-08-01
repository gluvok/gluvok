/**
 * @file lib/store/access.ts
 * @description Role-based access control (RBAC) matrix and permission helper functions.
 */

import { Role, ProjectSlug, EntityKey, FieldRequirementMode, PermissionKey, TenantMode } from "@/lib/constants/enums"
import { useConfigStore } from "./config"
import { useAuthStore } from "./auth"

export interface Permission {
  /** Whether this role can query records from this entity table */
  read: boolean
  /** Whether this role can write/update records in this entity table */
  write: boolean
  /** Whether this role can delete records from this entity table */
  delete: boolean
  /** Whether this role can create new records in this entity table */
  create: boolean
  /** Whether this role should see this entity page in the dashboard/sidebar */
  show: boolean
  /** Whether this role can use filters in the table toolbar */
  filter: boolean
  /** List of hidden column keys for data tables. If undefined or empty, all columns are shown. */
  hiddenColumns?: string[]
  /** List of hidden field keys for add/edit form dialogs. If undefined or empty, all fields are shown. */
  hiddenFields?: string[]
  /** Fields this role may modify when a record is being edited. */
  editableFields?: string[]
}

export type RoleAccessMatrix = {
  [K in ProjectSlug]: Permission
}

export type RbacMatrix = {
  [key in Role]: RoleAccessMatrix
}

export const RBAC_MATRIX: RbacMatrix = {
  [Role.ADMIN]: {
    [ProjectSlug.PROFILES]: {
      read: true,
      write: true,
      delete: true,
      create: true,
      show: true,
      filter: true,
    },
    [ProjectSlug.CENTERS]: {
      read: true,
      write: true,
      delete: true,
      create: true,
      show: true,
      filter: true,
    },
    [ProjectSlug.COMMODITIES]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: true,
      filter: true,
    },
    [ProjectSlug.RATES]: {
      read: true,
      write: true,
      delete: true,
      create: true,
      show: true,
      filter: true,
    },
    [ProjectSlug.CUSTOMERS]: {
      read: true,
      write: true,
      delete: true,
      create: true,
      show: true,
      filter: true,
    },
    [ProjectSlug.WEIGHMENTS]: {
      read: true,
      write: true,
      delete: true,
      create: true,
      show: true,
      filter: true,
      editableFields: [EntityKey.WEIGHT],
    },
    [ProjectSlug.CONFIGS]: {
      read: true,
      write: true,
      delete: true,
      create: true,
      show: true,
      filter: true,
    },
  },
  [Role.MANAGER]: {
    [ProjectSlug.PROFILES]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: true,
    },
    [ProjectSlug.CENTERS]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: false,
    },
    [ProjectSlug.COMMODITIES]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: true,
    },
    [ProjectSlug.RATES]: {
      read: true,
      write: true,
      delete: false,
      create: true,
      show: true,
      filter: true,
    },
    [ProjectSlug.CUSTOMERS]: {
      read: true,
      write: true,
      delete: false,
      create: true,
      show: true,
      filter: true,
    },
    [ProjectSlug.WEIGHMENTS]: {
      read: true,
      write: true,
      delete: false,
      create: true,
      show: true,
      filter: true,
    },
    [ProjectSlug.CONFIGS]: {
      read: false,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: false,
    },
  },
  [Role.OPERATOR]: {
    [ProjectSlug.PROFILES]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: true,
    },
    [ProjectSlug.CENTERS]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: false,
    },
    [ProjectSlug.COMMODITIES]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: true,
    },
    [ProjectSlug.RATES]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: true,
    },
    [ProjectSlug.CUSTOMERS]: {
      read: true,
      write: true,
      delete: false,
      create: true,
      show: true,
      filter: true,
    },
    [ProjectSlug.WEIGHMENTS]: {
      read: true,
      write: true,
      delete: false,
      create: true,
      show: true,
      filter: true,
    },
    [ProjectSlug.CONFIGS]: {
      read: false,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: false,
    },
  },
  [Role.BASE]: {
    [ProjectSlug.PROFILES]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: true,
    },
    [ProjectSlug.CENTERS]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: false,
    },
    [ProjectSlug.COMMODITIES]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: true,
    },
    [ProjectSlug.RATES]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: true,
    },
    [ProjectSlug.CUSTOMERS]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: true,
    },
    [ProjectSlug.WEIGHMENTS]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: true,
      filter: true,
    },
    [ProjectSlug.CONFIGS]: {
      read: false,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: false,
    },
  },
};

export function getActiveTenantMode(): TenantMode {
  if (typeof window !== "undefined") {
    const user = useAuthStore.getState().user
    if (user?.tenant_mode) return user.tenant_mode

    const hostname = window.location.hostname
    const rootDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "localhost"
    if (hostname !== rootDomain && hostname.endsWith(`.${rootDomain}`)) {
      return TenantMode.DEDICATED
    }
  }
  return TenantMode.SHARED
}

export function getPermissions(role: Role | null | undefined, projectSlug: string, mode?: TenantMode): Permission {
  if (!role) {
    return { read: false, write: false, delete: false, create: false, show: false, filter: false }
  }
  const roleMatrix = RBAC_MATRIX[role]
  if (!roleMatrix) {
    return { read: false, write: false, delete: false, create: false, show: false, filter: false }
  }
  const basePerm = roleMatrix[projectSlug as ProjectSlug] || { read: false, write: false, delete: false, create: false, show: false, filter: false }

  const effectiveMode = mode || getActiveTenantMode()

  if (effectiveMode === TenantMode.DEDICATED) {


    const commoditiesOverride = role === Role.ADMIN && projectSlug === ProjectSlug.COMMODITIES
      ? { read: true, write: true, delete: true, create: true, show: true, filter: true }
      : {}

    return {
      ...basePerm,
      ...commoditiesOverride,
    }
  }

  return basePerm
}

export function hasPageAccess(role: Role | null | undefined, projectSlug: string, mode?: TenantMode): boolean {
  return getPermissions(role, projectSlug, mode).show
}

export function hasCreateAccess(role: Role | null | undefined, projectSlug: string, mode?: TenantMode): boolean {
  return getPermissions(role, projectSlug, mode).create
}

export function hasDeleteAccess(role: Role | null | undefined, projectSlug: string, mode?: TenantMode): boolean {
  return getPermissions(role, projectSlug, mode).delete
}

export function hasPermission(
  subject: Role | { role: string } | null | undefined,
  projectSlug: string,
  operation: PermissionKey,
  fieldKey?: string,
  mode?: TenantMode,
): boolean {
  const role = typeof subject === "string" ? subject as Role : subject?.role as Role | undefined
  const permissions = getPermissions(role, projectSlug, mode)
  if (operation === PermissionKey.EDIT_FIELD) {
    return fieldKey != null && permissions.editableFields?.includes(fieldKey) === true
  }
  return permissions[operation] ?? false
}

export function isColumnVisible(role: Role | null | undefined, projectSlug: string, columnKey: string, mode?: TenantMode): boolean {
  if (columnKey === EntityKey.FACTORY_ID || columnKey === EntityKey.FACTORY_NAME) {
    return false
  }

  const effectiveMode = mode || getActiveTenantMode()
  const perms = getPermissions(role, projectSlug, effectiveMode)
  if (perms.hiddenColumns && perms.hiddenColumns.includes(columnKey)) return false

  const config = useConfigStore.getState().config
  if (projectSlug === ProjectSlug.CUSTOMERS && columnKey === EntityKey.GOVT_ID) {
    if (config?.govtIdMode === FieldRequirementMode.NOT_REQUIRED) return false
  }
  if (projectSlug === ProjectSlug.PROFILES && columnKey === EntityKey.AADHAR_NUMBER) {
    if (config?.aadharNumberMode === FieldRequirementMode.NOT_REQUIRED) return false
  }

  return true
}

export function isFieldVisible(role: Role | null | undefined, projectSlug: string, fieldKey: string, mode?: TenantMode): boolean {
  if (fieldKey === EntityKey.FACTORY_ID || fieldKey === EntityKey.FACTORY_NAME) {
    return false
  }

  const effectiveMode = mode || getActiveTenantMode()
  const perms = getPermissions(role, projectSlug, effectiveMode)
  if (perms.hiddenFields && perms.hiddenFields.includes(fieldKey)) return false

  const config = useConfigStore.getState().config
  if (projectSlug === ProjectSlug.CUSTOMERS && fieldKey === EntityKey.GOVT_ID) {
    if (config?.govtIdMode === FieldRequirementMode.NOT_REQUIRED) return false
  }
  if (projectSlug === ProjectSlug.PROFILES && fieldKey === EntityKey.AADHAR_NUMBER) {
    if (config?.aadharNumberMode === FieldRequirementMode.NOT_REQUIRED) return false
  }

  return true
}

export function isFieldRequired(projectSlug: string, fieldKey: string, defaultRequired?: boolean): boolean {
  const config = useConfigStore.getState().config
  if (projectSlug === ProjectSlug.CUSTOMERS && fieldKey === EntityKey.GOVT_ID) {
    if (config?.govtIdMode === FieldRequirementMode.MANDATORY) return true
    if (config?.govtIdMode === FieldRequirementMode.OPTIONAL || config?.govtIdMode === FieldRequirementMode.NOT_REQUIRED) return false
  }
  if (projectSlug === ProjectSlug.PROFILES && fieldKey === EntityKey.AADHAR_NUMBER) {
    if (config?.aadharNumberMode === FieldRequirementMode.MANDATORY) return true
    if (config?.aadharNumberMode === FieldRequirementMode.OPTIONAL || config?.aadharNumberMode === FieldRequirementMode.NOT_REQUIRED) return false
  }
  return !!defaultRequired
}
