/**
 * @file components/projects/columns/actions/permissions.ts
 * @description RBAC helpers determining if the active user can write or delete a specific table row.
 */

import { type EntityRecord } from "@/types";
import { type AuthUser, getField, canDeleteUserRole } from "@/lib/store";
import { ProjectSlug, Role } from "@/lib/constants/enums";

/**
 * hasRowWritePermission
 * Returns true if the current user may edit the given row.
 *
 * Users project rules:
 * - A user can always edit their own row.
 * - Otherwise, the actor must be able to delete the target role (same hierarchy as delete).
 */
export function hasRowWritePermission<T extends EntityRecord>(
  item: T,
  projectSlug: string,
  currentUser: AuthUser | null,
): boolean {
  if (!currentUser) return false;

  switch (projectSlug) {
    case ProjectSlug.USERS: {
      const itemId = getField(item, "id");
      const itemRole = getField(item, "role") as Role;
      const isOwnUser = String(itemId) === String(currentUser.id);
      // Self-edit always allowed; otherwise same hierarchy as delete
      return isOwnUser || canDeleteUserRole(currentUser.role, itemRole);
    }

    case ProjectSlug.TICKETS: {
      if (currentUser.role === Role.ADMIN) return true;
      const authorId = getField(item, "user_id");
      return String(authorId) === String(currentUser.id);
    }

    default:
      return true;
  }
}

/**
 * hasRowDeletePermission
 * Returns true if the current user may delete the given row.
 *
 * Users project rules:
 * - No one can delete their own row.
 * - The actor's role must include the target role in its deletableRoles list.
 */
export function hasRowDeletePermission<T extends EntityRecord>(
  item: T,
  projectSlug: string,
  currentUser: AuthUser | null,
): boolean {
  if (!currentUser) return false;

  switch (projectSlug) {
    case ProjectSlug.USERS: {
      const itemId = getField(item, "id");
      const itemRole = getField(item, "role") as Role;
      const isOwnUser = String(itemId) === String(currentUser.id);
      if (isOwnUser) return false;
      return canDeleteUserRole(currentUser.role, itemRole);
    }

    case ProjectSlug.TICKETS: {
      if (currentUser.role === Role.ADMIN) return true;
      const authorId = getField(item, "user_id");
      return String(authorId) === String(currentUser.id);
    }

    default:
      return true;
  }
}

