import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { getTables } from "@/db/schema"
import { withAuth, apiError, isFKViolation, forbiddenError, hasPermission, StatusCodes, getFactoryConfig } from "@/db/helpers"
import { ProjectSlug, PermissionKey, TenantMode } from "@/lib/constants/enums"
import { getDynamicCustomerSchema } from "@/lib/validation"
import { hashPassword } from "@/lib/auth/password"

export const PUT = withAuth(async (req, user, db, mode, ctx) => {
  const { customers, users } = getTables(mode)
  const { id } = await ctx.params
  const customerId = parseInt(id, 10)

  // Fetch the record first to check ownership
  const [existing] = await db.select({ userId: customers.userId }).from(customers).where(eq(customers.id, customerId))
  const isOwn = existing?.userId != null && String(existing.userId) === String(user.sub)

  // Self-update allowed even without write permission; otherwise check RBAC
  if (!isOwn && !hasPermission(user, ProjectSlug.CUSTOMERS, PermissionKey.WRITE)) return forbiddenError()

  const body = await req.json()
  const activeConfig = await getFactoryConfig(user.factory_id, db, mode)
  const dynamicSchema = getDynamicCustomerSchema(activeConfig, true)
  const parsed = dynamicSchema.safeParse(body)

  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST)
  }

  const { name, father_name, password, is_active } = body

  const [updated] = await db
    .update(customers)
    .set({
      ...(name ? { name } : {}),
      ...(father_name ? { fatherName: father_name } : {}),
      updatedAt: new Date(),
    })
    .where(eq(customers.id, customerId))
    .returning()

  if (!updated) return apiError("Customer not found", StatusCodes.NOT_FOUND)

  if (updated.userId) {
    const userUpdates: Record<string, unknown> = { updatedAt: new Date() }
    if (password && typeof password === "string" && password.trim().length > 0) {
      userUpdates.passwordHash = await hashPassword(password.trim())
    }
    if (is_active !== undefined) {
      userUpdates.isActive = Boolean(is_active)
    }
    if (Object.keys(userUpdates).length > 1) {
      await db.update(users).set(userUpdates).where(eq(users.id, updated.userId))
    }
  }

  return NextResponse.json({
    data: {
      id: updated.id,
      govt_id: updated.govtId,
      name: updated.name,
      father_name: updated.fatherName,
      user_id: updated.userId,
      ...(mode === TenantMode.SHARED ? { factory_id: (updated as { factoryId?: number }).factoryId } : {}),
      is_active: is_active ?? true,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    },
  })
})

export const DELETE = withAuth(async (_req, user, db, mode, ctx) => {
  if (!hasPermission(user, ProjectSlug.CUSTOMERS, PermissionKey.DELETE)) return forbiddenError()
  try {
    const { customers } = getTables(mode)
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
