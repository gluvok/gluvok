import { NextResponse } from "next/server";
import { getTables, sharedSchema } from "@/db/schema";
import {
  withAuth,
  withEntityScope,
  apiError,
  isFKViolation,
  forbiddenError,
  hasPermission,
  StatusCodes,
  formatEntityResponse,
} from "@/db/helpers";
import { ProjectSlug, PermissionKey } from "@/lib/constants/enums";

export const PATCH = withAuth(
  withEntityScope(
    (mode) => getTables(mode).centers,
    sharedSchema.centers.factoryId,
    async (req, user, db, mode, _ctx, { whereClause }) => {
      if (!hasPermission(user, ProjectSlug.CENTERS, PermissionKey.WRITE))
        return forbiddenError();
      const { centers } = getTables(mode);
      const { name } = await req.json();

      const [updated] = await db
        .update(centers)
        .set({ ...(name ? { name } : {}), updatedAt: new Date() })
        .where(whereClause)
        .returning();

      if (!updated) return apiError("Center not found", StatusCodes.NOT_FOUND);

      return formatEntityResponse(updated, mode);
    },
  ),
);

export const DELETE = withAuth(
  withEntityScope(
    (mode) => getTables(mode).centers,
    sharedSchema.centers.factoryId,
    async (_req, user, db, mode, _ctx, { whereClause }) => {
      if (!hasPermission(user, ProjectSlug.CENTERS, PermissionKey.DELETE))
        return forbiddenError();
      try {
        const { centers } = getTables(mode);
        await db.delete(centers).where(whereClause);
        return NextResponse.json({ success: true });
      } catch (error) {
        if (isFKViolation(error)) {
          return apiError(
            "Cannot delete this center because it is referenced by existing weighments. Please reassign or delete dependent records first.",
            StatusCodes.BAD_REQUEST,
          );
        }
        throw error;
      }
    },
  ),
);
