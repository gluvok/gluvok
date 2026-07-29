import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { rates } from "@/db/schema"
import { withAuth, apiError, isFKViolation, forbiddenError, hasPermission, StatusCodes } from "@/db/helpers"
import { ProjectSlug, PermissionKey } from "@/lib/constants/enums"

export const PUT = withAuth(async (req, user, ctx) => {
  if (!hasPermission(user, ProjectSlug.RATES, PermissionKey.WRITE)) return forbiddenError()
  const { id } = await ctx.params
  const { unitPrice, unit_price, unit } = await req.json()
  const targetUnitPrice = unitPrice ?? unit_price

  const [updated] = await db
    .update(rates)
    .set({
      ...(targetUnitPrice ? { unitPrice: String(targetUnitPrice) } : {}),
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
      factory_id: updated.factoryId,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    },
  })
})

export const DELETE = withAuth(async (_req, user, ctx) => {
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
