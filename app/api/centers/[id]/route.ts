import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { centers } from "@/db/schema"
import { withAuth, apiError, isFKViolation, StatusCodes } from "@/db/helpers"

export const PUT = withAuth(async (req, _user, ctx) => {
  const { id } = await ctx.params
  const centerId = parseInt(id, 10)
  const { name } = await req.json()

  const [updated] = await db
    .update(centers)
    .set({ ...(name ? { name } : {}), updatedAt: new Date() })
    .where(eq(centers.id, centerId))
    .returning()

  if (!updated) return apiError("Center not found", StatusCodes.NOT_FOUND)

  return NextResponse.json({
    data: {
      id: updated.id,
      name: updated.name,
      factory_id: updated.factoryId,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    },
  })
})

export const DELETE = withAuth(async (_req, _user, ctx) => {
  try {
    const { id } = await ctx.params
    await db.delete(centers).where(eq(centers.id, parseInt(id, 10)))
    return NextResponse.json({ success: true })
  } catch (error) {
    if (isFKViolation(error)) {
      return apiError(
        "Cannot delete this center because it is referenced by existing weighments. Please reassign or delete dependent records first.",
        StatusCodes.BAD_REQUEST
      )
    }
    throw error
  }
})
