import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { getTables, sharedSchema } from "@/db/schema";
import { type JWTPayload } from "@/lib/auth/jwt";
import {
  withAuth,
  apiError,
  isFKViolation,
  forbiddenError,
  getScopedEntityWhereClause,
  hasPermission,
  StatusCodes,
  formatEntityResponse,
} from "@/db/helpers";
import { ProjectSlug, PermissionKey, TenantMode } from "@/lib/constants/enums";

function getCenterScope(user: JWTPayload, mode: TenantMode, centerId: number) {
  const { centers } = getTables(mode);
  return {
    centers,
    whereClause: getScopedEntityWhereClause(
      user,
      mode,
      eq(centers.id, centerId),
      sharedSchema.centers.factoryId,
    ),
  };
}

export const PATCH = withAuth(async (req, user, db, mode, ctx) => {
  if (!hasPermission(user, ProjectSlug.CENTERS, PermissionKey.WRITE))
    return forbiddenError();
  const { id } = await ctx.params;
  const centerId = parseInt(id, 10);
  const { centers, whereClause } = getCenterScope(user, mode, centerId);
  if (!whereClause) return forbiddenError();
  const { name } = await req.json();

  const [updated] = await db
    .update(centers)
    .set({ ...(name ? { name } : {}), updatedAt: new Date() })
    .where(whereClause)
    .returning();

  if (!updated) return apiError("Center not found", StatusCodes.NOT_FOUND);

  return formatEntityResponse(updated, mode);
});

export const DELETE = withAuth(async (_req, user, db, mode, ctx) => {
  if (!hasPermission(user, ProjectSlug.CENTERS, PermissionKey.DELETE))
    return forbiddenError();
  try {
    const { id } = await ctx.params;
    const { centers, whereClause } = getCenterScope(
      user,
      mode,
      parseInt(id, 10),
    );
    if (!whereClause) return forbiddenError();
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
});
