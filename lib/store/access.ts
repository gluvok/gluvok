/**
 * @file lib/store/access.ts
 * @description Role-based access control (RBAC) matrix and permission helper functions.
 */

import { Role, ProjectSlug, PermissionKey } from "@/lib/constants/enums";

export interface Permission {
  read: boolean;
  write: boolean;
  delete: boolean;
  create: boolean;
  show: boolean;
  filter: boolean;
  hiddenColumns?: string[];
  hiddenFields?: string[];
  editableFields?: string[];
}

export type RoleAccessMatrix = {
  [K in ProjectSlug]: Permission;
};

export type RbacMatrix = {
  [key in Role]: RoleAccessMatrix;
};

export const RBAC_MATRIX: RbacMatrix = {
  [Role.ADMIN]: {
    [ProjectSlug.USERS]: {
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
    [ProjectSlug.ENTRIES]: {
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
      create: false,
      show: true,
      filter: true,
      editableFields: ["weight"],
    },
    [ProjectSlug.SETTINGS]: {
      read: true,
      write: true,
      delete: false,
      create: false,
      show: true,
      filter: false,
      editableFields: ["name", "check_center_on_merge"],
    },
  },
  [Role.MANAGER]: {
    [ProjectSlug.USERS]: {
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
    [ProjectSlug.ENTRIES]: {
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
      create: false,
      show: true,
      filter: true,
    },
    [ProjectSlug.SETTINGS]: {
      read: true,
      write: true,
      delete: false,
      create: false,
      show: true,
      filter: false,
      editableFields: ["check_center_on_merge"],
    },
  },
  [Role.OPERATOR]: {
    [ProjectSlug.USERS]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: false,
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
    [ProjectSlug.ENTRIES]: {
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
  [Role.BASE]: {
    [ProjectSlug.USERS]: {
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
    [ProjectSlug.ENTRIES]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: true,
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
  [Role.HARDWARE]: {
    [ProjectSlug.USERS]: {
      read: false,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: false,
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
      read: false,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: false,
    },
    [ProjectSlug.RATES]: {
      read: false,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: false,
    },
    [ProjectSlug.CUSTOMERS]: {
      read: false,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: false,
    },
    [ProjectSlug.ENTRIES]: {
      read: true,
      write: true,
      delete: false,
      create: true,
      show: false,
      filter: false,
    },
    [ProjectSlug.WEIGHMENTS]: {
      read: false,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: false,
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
};

export function getPermissions(role: Role | null | undefined, projectSlug: string): Permission {
  if (!role) {
    return { read: false, write: false, delete: false, create: false, show: false, filter: false };
  }
  const roleMatrix = RBAC_MATRIX[role];
  if (!roleMatrix) {
    return { read: false, write: false, delete: false, create: false, show: false, filter: false };
  }
  return (
    roleMatrix[projectSlug as ProjectSlug] || {
      read: false,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: false,
    }
  );
}

export function hasPageAccess(role: Role | null | undefined, projectSlug: string): boolean {
  return getPermissions(role, projectSlug).show;
}

export function hasCreateAccess(role: Role | null | undefined, projectSlug: string): boolean {
  if (
    projectSlug === ProjectSlug.COMMODITIES ||
    projectSlug === ProjectSlug.WEIGHMENTS ||
    projectSlug === ProjectSlug.SETTINGS
  ) {
    return false;
  }
  return getPermissions(role, projectSlug).create;
}

export function hasDeleteAccess(role: Role | null | undefined, projectSlug: string): boolean {
  return getPermissions(role, projectSlug).delete;
}

export function hasPermission(
  subject: Role | { role: string } | null | undefined,
  projectSlug: string,
  operation: PermissionKey,
  fieldKey?: string,
): boolean {
  const role =
    typeof subject === "string" ? (subject as Role) : (subject?.role as Role | undefined);
  const permissions = getPermissions(role, projectSlug);
  if (operation === PermissionKey.EDIT_FIELD) {
    return fieldKey != null && permissions.editableFields?.includes(fieldKey) === true;
  }
  return permissions[operation] ?? false;
}

export function isColumnVisible(
  role: Role | null | undefined,
  projectSlug: string,
  columnKey: string,
): boolean {
  if (columnKey === "factory_id" || columnKey === "factory_name") {
    return false;
  }

  const perms = getPermissions(role, projectSlug);
  if (perms.hiddenColumns && perms.hiddenColumns.includes(columnKey)) return false;

  return true;
}

export function isFieldVisible(
  role: Role | null | undefined,
  projectSlug: string,
  fieldKey: string,
): boolean {
  if (fieldKey === "factory_id" || fieldKey === "factory_name") {
    return false;
  }

  const perms = getPermissions(role, projectSlug);
  if (perms.hiddenFields && perms.hiddenFields.includes(fieldKey)) return false;

  return true;
}

export function isFieldRequired(
  _projectSlug: string,
  _fieldKey: string,
  defaultRequired?: boolean,
): boolean {
  return Boolean(defaultRequired);
}
