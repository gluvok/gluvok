import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { profiles, users } from "@/db/schema"
import { withAuth, apiError, isFKViolation, StatusCodes } from "@/db/helpers"

export const PUT = withAuth(async (req, _user, ctx) => {
  const { id } = await ctx.params
  const profileId = parseInt(id, 10)
  const { name, is_active } = await req.json()

  const [updated] = await db
    .update(profiles)
    .set({ ...(name ? { name } : {}), updatedAt: new Date() })
    .where(eq(profiles.id, profileId))
    .returning()

  if (!updated) return apiError("Profile not found", StatusCodes.NOT_FOUND)

  if (is_active !== undefined) {
    await db
      .update(users)
      .set({ isActive: Boolean(is_active), updatedAt: new Date() })
      .where(eq(users.id, updated.userId))
  }

  return NextResponse.json({
    data: {
      id: updated.id,
      user_id: updated.userId,
      name: updated.name,
      aadhar_number: updated.aadharNumber,
      role: updated.role,
      is_active: is_active ?? true,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    },
  })
})

export const DELETE = withAuth(async (_req, _user, ctx) => {
  try {
    const { id } = await ctx.params
    await db.delete(profiles).where(eq(profiles.id, parseInt(id, 10)))
    return NextResponse.json({ success: true })
  } catch (error) {
    if (isFKViolation(error)) {
      return apiError(
        "Cannot delete this profile because it is referenced by existing weighments. Please reassign or delete dependent records first.",
        StatusCodes.BAD_REQUEST
      )
    }
    throw error
  }
})
