import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { commodities } from "@/db/schema"
import { withAuth, apiError, isFKViolation, forbiddenError, hasPermission, StatusCodes } from "@/db/helpers"
import { ProjectSlug, PermissionKey } from "@/lib/constants/enums"

export const PUT = withAuth(async (req, user, ctx) => {
  if (!hasPermission(user, ProjectSlug.COMMODITIES, PermissionKey.WRITE)) return forbiddenError()
  const { id } = await ctx.params
  const { name } = await req.json()

  const [updated] = await db
    .update(commodities)
    .set({ ...(name ? { name } : {}), updatedAt: new Date() })
    .where(eq(commodities.id, parseInt(id, 10)))
    .returning()

  if (!updated) return apiError("Commodity not found", StatusCodes.NOT_FOUND)

  return NextResponse.json({
    data: {
      id: updated.id,
      name: updated.name,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    },
  })
})

export const DELETE = withAuth(async (_req, user, ctx) => {
  if (!hasPermission(user, ProjectSlug.COMMODITIES, PermissionKey.DELETE)) return forbiddenError()
  try {
    const { id } = await ctx.params
    await db.delete(commodities).where(eq(commodities.id, parseInt(id, 10)))
    return NextResponse.json({ success: true })
  } catch (error) {
    if (isFKViolation(error)) {
      return apiError(
        "Cannot delete this commodity because it is referenced by existing rates or weighments. Please reassign or delete dependent records first.",
        StatusCodes.BAD_REQUEST
      )
    }
    throw error
  }
})
