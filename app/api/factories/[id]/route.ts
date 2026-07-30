import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { factories } from "@/db/schema"
import { withAuth, apiError, isFKViolation, StatusCodes } from "@/db/helpers"
import { Role, TenantMode } from "@/lib/constants/enums"

export const PUT = withAuth(async (req, _user, db, mode, ctx) => {
  if (mode === TenantMode.DEDICATED) {
    return NextResponse.json({ error: "Not available in dedicated mode" }, { status: 405 })
  }
  const { id } = await ctx.params
  const factoryId = parseInt(id, 10)
  const body = await req.json()
  const { name } = body

  const [updated] = await db
    .update(factories)
    .set({ ...(name ? { name } : {}), updatedAt: new Date() })
    .where(eq(factories.id, factoryId))
    .returning()

  if (!updated) return apiError("Factory not found", StatusCodes.NOT_FOUND)

  return NextResponse.json({
    data: {
      id: updated.id,
      name: updated.name,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    },
  })
}, Role.SUPER_ADMIN)

export const DELETE = withAuth(async (_req, _user, db, mode, ctx) => {
  if (mode === TenantMode.DEDICATED) {
    return NextResponse.json({ error: "Not available in dedicated mode" }, { status: 405 })
  }
  try {
    const { id } = await ctx.params
    await db.delete(factories).where(eq(factories.id, parseInt(id, 10)))
    return NextResponse.json({ success: true })
  } catch (error) {
    if (isFKViolation(error)) {
      return apiError(
        "Cannot delete this factory because it is referenced by existing centers, users, or rates. Please reassign or delete dependent records first.",
        StatusCodes.BAD_REQUEST
      )
    }
    throw error
  }
}, Role.SUPER_ADMIN)
