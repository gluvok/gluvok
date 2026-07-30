import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm";
import { getTables, sharedSchema } from "@/db/schema";
import {
  withAuth,
  apiError,
  formatEntityResponse,
  forbiddenError,
  hasPermission,
  isFKViolation,
  StatusCodes,
} from "@/db/helpers";
import { PermissionKey, ProjectSlug, TenantMode } from "@/lib/constants/enums";

export const PUT = withAuth(async (req, user, db, mode, ctx) => {
  if (!hasPermission(user, ProjectSlug.WEIGHMENTS, PermissionKey.WRITE))
    return forbiddenError();
  const { weighments, centers } = getTables(mode);
  const { id } = await ctx.params;
  const weighmentId = parseInt(id, 10);
  if (mode === TenantMode.SHARED && user.factory_id == null)
    return forbiddenError();
  const weighmentWhereClause =
    mode === TenantMode.SHARED
      ? and(
          eq(weighments.id, weighmentId),
          eq(sharedSchema.centers.factoryId, user.factory_id as number),
        )
      : eq(weighments.id, weighmentId);
  const [existing] = await db
    .select({ id: weighments.id, centerId: weighments.centerId })
    .from(weighments)
    .innerJoin(centers, eq(weighments.centerId, centers.id))
    .where(weighmentWhereClause)
    .limit(1);
  if (!existing) return apiError("Weighment not found", StatusCodes.NOT_FOUND);
  const { vehicle_number, weight, is_active } = await req.json();

  const [updated] = await db
    .update(weighments)
    .set({
      ...(vehicle_number ? { vehicleNumber: vehicle_number } : {}),
      ...(weight ? { weight: String(weight) } : {}),
      ...(is_active !== undefined ? { isActive: Boolean(is_active) } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(weighments.id, existing.id),
        eq(weighments.centerId, existing.centerId),
      ),
    )
    .returning();

  if (!updated) return apiError("Weighment not found", StatusCodes.NOT_FOUND);

  return formatEntityResponse(updated, mode);
});

export const DELETE = withAuth(async (_req, user, db, mode, ctx) => {
  if (!hasPermission(user, ProjectSlug.WEIGHMENTS, PermissionKey.DELETE))
    return forbiddenError();
  try {
    const { weighments, centers } = getTables(mode);
    const { id } = await ctx.params;
    const weighmentId = parseInt(id, 10);
    if (mode === TenantMode.SHARED && user.factory_id == null)
      return forbiddenError();
    const weighmentWhereClause =
      mode === TenantMode.SHARED
        ? and(
            eq(weighments.id, weighmentId),
            eq(sharedSchema.centers.factoryId, user.factory_id as number),
          )
        : eq(weighments.id, weighmentId);
    const [existing] = await db
      .select({ id: weighments.id, centerId: weighments.centerId })
      .from(weighments)
      .innerJoin(centers, eq(weighments.centerId, centers.id))
      .where(weighmentWhereClause)
      .limit(1);
    if (!existing)
      return apiError("Weighment not found", StatusCodes.NOT_FOUND);
    await db
      .delete(weighments)
      .where(
        and(
          eq(weighments.id, existing.id),
          eq(weighments.centerId, existing.centerId),
        ),
      );
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isFKViolation(error)) {
      return apiError(
        "Cannot delete this weighment because it is referenced by other records.",
        StatusCodes.BAD_REQUEST,
      );
    }
    throw error;
  }
});
