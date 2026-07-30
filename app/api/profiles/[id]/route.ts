import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { getTables } from "@/db/schema"
import { withAuth, apiError, isFKViolation, StatusCodes, getFactoryConfig } from "@/db/helpers"
import { getDynamicProfileSchema } from "@/lib/validation"
import { hashPassword } from "@/lib/auth/password"
import { Role } from "@/lib/constants/enums"

export const PUT = withAuth(async (req, user, db, mode, ctx) => {
  const { profiles, users } = getTables(mode)
  const { id } = await ctx.params
  const profileId = parseInt(id, 10)
  const body = await req.json()

  const activeConfig = await getFactoryConfig(user.factory_id, db, mode)
  const dynamicSchema = getDynamicProfileSchema(activeConfig, true)
  const parsed = dynamicSchema.safeParse(body)

  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST)
  }

  const { name, password, role, is_active } = body
  const validRole = role && Object.values(Role).includes(role as Role) ? (role as Role) : undefined

  const [updated] = await db
    .update(profiles)
    .set({
      ...(name ? { name } : {}),
      ...(validRole ? { role: validRole } : {}),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, profileId))
    .returning()

  if (!updated) return apiError("Profile not found", StatusCodes.NOT_FOUND)

  const userUpdates: Record<string, unknown> = { updatedAt: new Date() }
  if (password && typeof password === "string" && password.trim().length > 0) {
    userUpdates.passwordHash = await hashPassword(password.trim())
  }
  if (validRole) {
    userUpdates.role = validRole
  }
  if (is_active !== undefined) {
    userUpdates.isActive = Boolean(is_active)
  }

  if (Object.keys(userUpdates).length > 1) {
    await db.update(users).set(userUpdates).where(eq(users.id, updated.userId))
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

export const DELETE = withAuth(async (_req, _user, db, mode, ctx) => {
  try {
    const { profiles } = getTables(mode)
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
