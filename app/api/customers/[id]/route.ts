import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { customers, users } from "@/db/schema"
import { withAuth, apiError, isFKViolation, StatusCodes } from "@/db/helpers"

export const PUT = withAuth(async (req, _user, ctx) => {
  const { id } = await ctx.params
  const customerId = parseInt(id, 10)
  const { name, fatherName, father_name, is_active } = await req.json()
  const targetFatherName = fatherName ?? father_name

  const [updated] = await db
    .update(customers)
    .set({
      ...(name ? { name } : {}),
      ...(targetFatherName ? { fatherName: targetFatherName } : {}),
      updatedAt: new Date(),
    })
    .where(eq(customers.id, customerId))
    .returning()

  if (!updated) return apiError("Customer not found", StatusCodes.NOT_FOUND)

  if (is_active !== undefined && updated.userId) {
    await db
      .update(users)
      .set({ isActive: Boolean(is_active), updatedAt: new Date() })
      .where(eq(users.id, updated.userId))
  }

  return NextResponse.json({
    data: {
      id: updated.id,
      govt_id: updated.govtId,
      name: updated.name,
      father_name: updated.fatherName,
      user_id: updated.userId,
      factory_id: updated.factoryId,
      is_active: is_active ?? true,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    },
  })
})

export const DELETE = withAuth(async (_req, _user, ctx) => {
  try {
    const { id } = await ctx.params
    await db.delete(customers).where(eq(customers.id, parseInt(id, 10)))
    return NextResponse.json({ success: true })
  } catch (error) {
    if (isFKViolation(error)) {
      return apiError(
        "Cannot delete this customer because they are referenced by existing weighments. Please reassign or delete dependent weighments first.",
        StatusCodes.BAD_REQUEST
      )
    }
    throw error
  }
})
