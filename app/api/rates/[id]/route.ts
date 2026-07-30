import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { rates } from "@/db/schema"
import { withAuth, apiError, isFKViolation, forbiddenError, hasPermission, StatusCodes } from "@/db/helpers"
import { ProjectSlug, PermissionKey, TenantMode } from "@/lib/constants/enums"

export const PUT = withAuth(async (req, user, db, mode, ctx) => {
  if (!hasPermission(user, ProjectSlug.RATES, PermissionKey.WRITE)) return forbiddenError()
  const { id } = await ctx.params
  const { unit_price, unit } = await req.json()

  const [updated] = await db
    .update(rates)
    .set({
      ...(unit_price ? { unitPrice: String(unit_price) } : {}),
      ...(unit ? { unit } : {}),
      updatedAt: new Date(),
    })
    .where(eq(rates.id, parseInt(id, 10)))
    .returning()

  if (!updated) return apiError("Rate not found", StatusCodes.NOT_FOUND)

  return NextResponse.json({
    data: {
      id: updated.id,
      commodity_id: updated.commodityId,
      unit_price: updated.unitPrice,
      unit: updated.unit,
      ...(mode === TenantMode.SHARED ? { factory_id: (updated as { factoryId?: number }).factoryId } : {}),
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    },
  })
})

export const DELETE = withAuth(async (_req, user, db, _mode, ctx) => {
  if (!hasPermission(user, ProjectSlug.RATES, PermissionKey.DELETE)) return forbiddenError()
  try {
    const { id } = await ctx.params
    await db.delete(rates).where(eq(rates.id, parseInt(id, 10)))
    return NextResponse.json({ success: true })
  } catch (error) {
    if (isFKViolation(error)) {
      return apiError(
        "Cannot delete this rate because it is referenced by existing weighments. Please reassign or delete dependent weighments first.",
        StatusCodes.BAD_REQUEST
      )
    }
    throw error
  }
})
