import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { getTables, sharedSchema } from "@/db/schema";
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
import { ProjectSlug, PermissionKey } from "@/lib/constants/enums";

export const PATCH = withAuth(async (req, user, db, mode, ctx) => {
  if (!hasPermission(user, ProjectSlug.RATES, PermissionKey.WRITE))
    return forbiddenError();
  const { rates } = getTables(mode);
  const { id } = await ctx.params;
  const whereClause = getScopedEntityWhereClause(
    user,
    mode,
    eq(rates.id, parseInt(id, 10)),
    sharedSchema.rates.factoryId,
  );
  if (!whereClause) return forbiddenError();
  const { unit_price, unit } = await req.json();

  const [updated] = await db
    .update(rates)
    .set({
      ...(unit_price ? { unitPrice: String(unit_price) } : {}),
      ...(unit ? { unit } : {}),
      updatedAt: new Date(),
    })
    .where(whereClause)
    .returning();

  if (!updated) return apiError("Rate not found", StatusCodes.NOT_FOUND);

  return formatEntityResponse(updated, mode);
});

export const DELETE = withAuth(async (_req, user, db, mode, ctx) => {
  if (!hasPermission(user, ProjectSlug.RATES, PermissionKey.DELETE))
    return forbiddenError();
  try {
    const { rates } = getTables(mode);
    const { id } = await ctx.params;
    const whereClause = getScopedEntityWhereClause(
      user,
      mode,
      eq(rates.id, parseInt(id, 10)),
      sharedSchema.rates.factoryId,
    );
    if (!whereClause) return forbiddenError();
    await db.delete(rates).where(whereClause);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isFKViolation(error)) {
      return apiError(
        "Cannot delete this rate because it is referenced by existing weighments. Please reassign or delete dependent weighments first.",
        StatusCodes.BAD_REQUEST,
      );
    }
    throw error;
  }
});
