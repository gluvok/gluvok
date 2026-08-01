import { NextResponse } from "next/server"
import { eq, inArray } from "drizzle-orm";
import { getTables, sharedSchema } from "@/db/schema";
import {
  withAuth,
  withEntityScope,
  apiError,
  formatEntityResponse,
  forbiddenError,
  hasPermission,
  isFKViolation,
  StatusCodes,
} from "@/db/helpers";
import { PermissionKey, ProjectSlug } from "@/lib/constants/enums";

export const PATCH = withAuth(
  withEntityScope(
    (mode) => getTables(mode).weighments,
    sharedSchema.centers.factory_id,
    async (
      req,
      user,
      db,
      mode,
      _ctx,
      { whereClause: weighmentWhereClause },
    ) => {
      if (!hasPermission(user, ProjectSlug.WEIGHMENTS, PermissionKey.WRITE))
        return forbiddenError();
      const { weighments, centers } = getTables(mode);
      const scopedWeighmentIds = db
        .select({ id: weighments.id })
        .from(weighments)
        .innerJoin(centers, eq(weighments.center_id, centers.id))
        .where(weighmentWhereClause);
      const { vehicle_number, weight, is_active } = await req.json();

      const [updated] = await db
        .update(weighments)
        .set({
          ...(vehicle_number ? { vehicle_number: vehicle_number } : {}),
          ...(weight ? { weight: String(weight) } : {}),
          ...(is_active !== undefined ? { is_active: Boolean(is_active) } : {}),
          updated_at: new Date(),
        })
        .where(inArray(weighments.id, scopedWeighmentIds))
        .returning();

      if (!updated)
        return apiError("Weighment not found", StatusCodes.NOT_FOUND);

      return formatEntityResponse(updated, mode);
    },
  ),
);

export const DELETE = withAuth(
  withEntityScope(
    (mode) => getTables(mode).weighments,
    sharedSchema.centers.factory_id,
    async (
      _req,
      user,
      db,
      mode,
      _ctx,
      { whereClause: weighmentWhereClause },
    ) => {
      if (!hasPermission(user, ProjectSlug.WEIGHMENTS, PermissionKey.DELETE))
        return forbiddenError();
      try {
        const { weighments, centers } = getTables(mode);
        const scopedWeighmentIds = db
          .select({ id: weighments.id })
          .from(weighments)
          .innerJoin(centers, eq(weighments.center_id, centers.id))
          .where(weighmentWhereClause);
        const [deleted] = await db
          .delete(weighments)
          .where(inArray(weighments.id, scopedWeighmentIds))
          .returning({ id: weighments.id });
        if (!deleted)
          return apiError("Weighment not found", StatusCodes.NOT_FOUND);
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
    },
  ),
);
