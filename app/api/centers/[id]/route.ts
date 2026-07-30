import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { centers } from "@/db/schema"
import { withAuth, apiError, isFKViolation, forbiddenError, hasPermission, StatusCodes, formatEntityResponse } from "@/db/helpers"
import { ProjectSlug, PermissionKey } from "@/lib/constants/enums"

export const PUT = withAuth(async (req, user, db, mode, ctx) => {
  if (!hasPermission(user, ProjectSlug.CENTERS, PermissionKey.WRITE)) return forbiddenError()
  const { id } = await ctx.params
  const centerId = parseInt(id, 10)
  const { name } = await req.json()

  const [updated] = await db
    .update(centers)
    .set({ ...(name ? { name } : {}), updatedAt: new Date() })
    .where(eq(centers.id, centerId))
    .returning()

  if (!updated) return apiError("Center not found", StatusCodes.NOT_FOUND)

  return formatEntityResponse(updated, mode)
})

export const DELETE = withAuth(async (_req, user, db, _mode, ctx) => {
  if (!hasPermission(user, ProjectSlug.CENTERS, PermissionKey.DELETE)) return forbiddenError()
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
