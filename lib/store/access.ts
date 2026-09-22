/**
 * @file lib/store/access.ts
 * @description Role-based access control (RBAC) matrix and permission helper functions.
 */

import { Role, ProjectSlug, PermissionKey } from "@/lib/constants/enums";
import {
  RBAC_MATRIX,
  type Permission,
  type RoleAccessMatrix,
  type RbacMatrix,
} from "./rbac-matrix";

export { RBAC_MATRIX, type Permission, type RoleAccessMatrix, type RbacMatrix };

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
    projectSlug === ProjectSlug.CENTERS ||
    projectSlug === ProjectSlug.COMMODITIES ||
    projectSlug === ProjectSlug.WEIGHMENTS ||
    projectSlug === ProjectSlug.SETTINGS ||
    projectSlug === ProjectSlug.TICKETS
  ) {
    return false;
  }
  return getPermissions(role, projectSlug).create;
}

export function hasDeleteAccess(role: Role | null | undefined, projectSlug: string): boolean {
  if (projectSlug === ProjectSlug.CENTERS) {
    return false;
  }
  return getPermissions(role, projectSlug).delete;
}

/**
 * canDeleteUserRole
 * Returns true if `actorRole` is permitted to delete/edit a user whose role is `targetRole`.
 * Self-deletion / self-edit are handled separately by the caller.
 */
export function canDeleteUserRole(actorRole: Role, targetRole: Role): boolean {
  const deletableRoles = getPermissions(actorRole, ProjectSlug.USERS).deletableRoles ?? [];
  return deletableRoles.includes(targetRole);
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
