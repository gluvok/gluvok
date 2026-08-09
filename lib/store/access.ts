/**
 * @file lib/store/access.ts
 * @description Role-based access control (RBAC) matrix and permission helper functions.
 */

import { Role, ProjectSlug, EntityKey, FieldRequirementMode, PermissionKey } from "@/lib/constants/enums"
import { useFactoryStore } from "./factory";

export interface Permission {
  read: boolean
  write: boolean
  delete: boolean
  create: boolean
  show: boolean
  filter: boolean
  hiddenColumns?: string[]
  hiddenFields?: string[]
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
      write: true,
      delete: true,
      create: true,
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
    [ProjectSlug.SETTINGS]: {
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
    [ProjectSlug.SETTINGS]: {
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
    [ProjectSlug.SETTINGS]: {
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
    [ProjectSlug.SETTINGS]: {
      read: false,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: false,
    },
  },
}

export function getPermissions(role: Role | null | undefined, projectSlug: string): Permission {
  if (!role) {
    return { read: false, write: false, delete: false, create: false, show: false, filter: false }
  }
  const roleMatrix = RBAC_MATRIX[role]
  if (!roleMatrix) {
    return { read: false, write: false, delete: false, create: false, show: false, filter: false }
  }
  return roleMatrix[projectSlug as ProjectSlug] || { read: false, write: false, delete: false, create: false, show: false, filter: false }
}

export function hasPageAccess(role: Role | null | undefined, projectSlug: string): boolean {
  return getPermissions(role, projectSlug).show
}

export function hasCreateAccess(role: Role | null | undefined, projectSlug: string): boolean {
  return getPermissions(role, projectSlug).create
}

export function hasDeleteAccess(role: Role | null | undefined, projectSlug: string): boolean {
  return getPermissions(role, projectSlug).delete
}

export function hasPermission(
  subject: Role | { role: string } | null | undefined,
  projectSlug: string,
  operation: PermissionKey,
  fieldKey?: string,
): boolean {
  const role = typeof subject === "string" ? subject as Role : subject?.role as Role | undefined
  const permissions = getPermissions(role, projectSlug)
  if (operation === PermissionKey.EDIT_FIELD) {
    return fieldKey != null && permissions.editableFields?.includes(fieldKey) === true
  }
  return permissions[operation] ?? false
}

export function isColumnVisible(role: Role | null | undefined, projectSlug: string, columnKey: string): boolean {
  if (columnKey === EntityKey.FACTORY_ID || columnKey === EntityKey.FACTORY_NAME) {
    return false
  }

  const perms = getPermissions(role, projectSlug)
  if (perms.hiddenColumns && perms.hiddenColumns.includes(columnKey)) return false

  const factory = useFactoryStore.getState().factory;
  if (projectSlug === ProjectSlug.CUSTOMERS && columnKey === EntityKey.GOVT_ID) {
    if (factory?.govt_id_mode === FieldRequirementMode.NOT_REQUIRED)
      return false;
  }
  if (projectSlug === ProjectSlug.PROFILES && columnKey === EntityKey.AADHAR_NUMBER) {
    if (factory?.aadhar_number_mode === FieldRequirementMode.NOT_REQUIRED)
      return false;
  }

  return true
}

export function isFieldVisible(role: Role | null | undefined, projectSlug: string, fieldKey: string): boolean {
  if (
    fieldKey === EntityKey.FACTORY_ID ||
    fieldKey === EntityKey.FACTORY_NAME
  ) {
    return false
  }

  const perms = getPermissions(role, projectSlug)
  if (perms.hiddenFields && perms.hiddenFields.includes(fieldKey)) return false

  const factory = useFactoryStore.getState().factory;
  if (projectSlug === ProjectSlug.CUSTOMERS && fieldKey === EntityKey.GOVT_ID) {
    if (factory?.govt_id_mode === FieldRequirementMode.NOT_REQUIRED)
      return false;
  }
  if (projectSlug === ProjectSlug.PROFILES && fieldKey === EntityKey.AADHAR_NUMBER) {
    if (factory?.aadhar_number_mode === FieldRequirementMode.NOT_REQUIRED)
      return false;
  }

  return true
}

export function isFieldRequired(projectSlug: string, fieldKey: string, defaultRequired?: boolean): boolean {
  const factory = useFactoryStore.getState().factory;
  if (projectSlug === ProjectSlug.CUSTOMERS && fieldKey === EntityKey.GOVT_ID) {
    if (factory?.govt_id_mode === FieldRequirementMode.MANDATORY) return true;
    if (
      factory?.govt_id_mode === FieldRequirementMode.OPTIONAL ||
      factory?.govt_id_mode === FieldRequirementMode.NOT_REQUIRED
    )
      return false;
  }
  if (projectSlug === ProjectSlug.PROFILES && fieldKey === EntityKey.AADHAR_NUMBER) {
    if (factory?.aadhar_number_mode === FieldRequirementMode.MANDATORY)
      return true;
    if (
      factory?.aadhar_number_mode === FieldRequirementMode.OPTIONAL ||
      factory?.aadhar_number_mode === FieldRequirementMode.NOT_REQUIRED
    )
      return false;
  }
  return !!defaultRequired
}
