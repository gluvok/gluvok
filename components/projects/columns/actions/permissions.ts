/**
 * @file components/projects/columns/actions/permissions.ts
 * @description RBAC helper determining if the active user can modify/delete a specific table row.
 */

import { type EntityRecord } from "@/types";
import { type AuthUser, getField } from "@/lib/store";
import { ProjectSlug, Role } from "@/lib/constants/enums";

/**
 * hasRowModifyPermission
 * Enforces entity-specific row-level edit and delete restrictions:
 * - Users: Admins can manage Manager/Operator/Base; Managers can manage Operator/Base; users can manage self.
 * - Tickets: Admins can modify any ticket; users can modify/delete only their own tickets.
 * - Other tables: Standard RBAC matrix applies.
 */
export function hasRowModifyPermission<T extends EntityRecord>(
  item: T,
  projectSlug: string,
  currentUser: AuthUser | null,
): boolean {
  if (!currentUser) return false;

  switch (projectSlug) {
    case ProjectSlug.USERS: {
      const itemId = getField(item, "id");
      const itemRole = getField(item, "role");

      const isOwnUser = String(itemId) === String(currentUser.id);
      const isAdminOfFactory = currentUser.role === Role.ADMIN;
      const isManagerOfFactory = currentUser.role === Role.MANAGER;

      return (
        isOwnUser ||
        (isAdminOfFactory && [Role.MANAGER, Role.OPERATOR, Role.BASE].includes(itemRole as Role)) ||
        (isManagerOfFactory && [Role.OPERATOR, Role.BASE].includes(itemRole as Role))
      );
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
