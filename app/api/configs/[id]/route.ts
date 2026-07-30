import { NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { sharedSchema, standaloneSchema } from "@/db/schema"
import { withAuth, apiError, forbiddenError, hasPermission, StatusCodes } from "@/db/helpers"
import { Role, TenantMode, ProjectSlug, PermissionKey, FieldRequirementMode } from "@/lib/constants/enums"

/**
 * PATCH /api/configs/[id]
 * Partially updates an existing configuration resource by ID.
 */
export const PATCH = withAuth(async (req, user, db, mode, context) => {
  if (!hasPermission(user, ProjectSlug.CONFIGS, PermissionKey.WRITE)) return forbiddenError()

  try {
    const params = await context.params
    const configId = Number(params.id)
    if (!configId) return apiError("Config not found", StatusCodes.NOT_FOUND)

    const body = await req.json()
    const { aadhar_number_mode, govt_id_mode, factory_id } = body

    const validModes = Object.values(FieldRequirementMode)
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    }
    if (aadhar_number_mode && validModes.includes(aadhar_number_mode)) {
      updates.aadharNumberMode = aadhar_number_mode
    }
    if (govt_id_mode && validModes.includes(govt_id_mode)) {
      updates.govtIdMode = govt_id_mode
    }

    if (mode === TenantMode.DEDICATED) {
      const [existing] = await db
        .select()
        .from(standaloneSchema.configs)
        .where(eq(standaloneSchema.configs.id, configId))
        .limit(1)

      if (!existing) return apiError("Config not found", StatusCodes.NOT_FOUND)

      const [updated] = await db
        .update(standaloneSchema.configs)
        .set(updates)
        .where(eq(standaloneSchema.configs.id, configId))
        .returning()

      return NextResponse.json({
        data: {
          id: updated.id,
          aadhar_number_mode: updated.aadharNumberMode,
          govt_id_mode: updated.govtIdMode,
          created_at: updated.createdAt,
          updated_at: updated.updatedAt,
        },
      })
    }

    // Shared Mode
    const sharedConfigs = sharedSchema.configs
    const isSuperAdmin = user.role === Role.SUPER_ADMIN

    if (isSuperAdmin && factory_id && Number(factory_id) > 0) {
      updates.factoryId = Number(factory_id)
    }

    const conditions = [eq(sharedConfigs.id, configId)]
    if (!isSuperAdmin && user.factory_id != null) {
      conditions.push(eq(sharedConfigs.factoryId, user.factory_id))
    }

    const [existing] = await db
      .select()
      .from(sharedConfigs)
      .where(and(...conditions))
      .limit(1)

    if (!existing) return apiError("Config not found", StatusCodes.NOT_FOUND)

    const [updated] = await db
      .update(sharedConfigs)
      .set(updates)
      .where(eq(sharedConfigs.id, configId))
      .returning()

    return NextResponse.json({
      data: {
        id: updated.id,
        factory_id: updated.factoryId,
        aadhar_number_mode: updated.aadharNumberMode,
        govt_id_mode: updated.govtIdMode,
        created_at: updated.createdAt,
        updated_at: updated.updatedAt,
      },
    })
  } catch (err) {
    console.error("Failed to update config:", err)
    return apiError("Database error while updating config", StatusCodes.INTERNAL_SERVER_ERROR)
  }
})

export const PUT = PATCH

export const DELETE = withAuth(async (_req, user, db, mode, context) => {
  if (!hasPermission(user, ProjectSlug.CONFIGS, PermissionKey.DELETE)) return forbiddenError()

  try {
    const params = await context.params
    const configId = Number(params.id)
    if (!configId) return apiError("Config not found", StatusCodes.NOT_FOUND)

    if (mode === TenantMode.DEDICATED) {
      await db.delete(standaloneSchema.configs).where(eq(standaloneSchema.configs.id, configId))
      return NextResponse.json({ success: true, message: "Config deleted successfully" })
    }

    const sharedConfigs = sharedSchema.configs
    const conditions = [eq(sharedConfigs.id, configId)]
    if (user.role !== Role.SUPER_ADMIN && user.factory_id != null) {
      conditions.push(eq(sharedConfigs.factoryId, user.factory_id))
    }

    const [existing] = await db
      .select()
      .from(sharedConfigs)
      .where(and(...conditions))
      .limit(1)

    if (!existing) return apiError("Config not found", StatusCodes.NOT_FOUND)

    await db.delete(sharedConfigs).where(eq(sharedConfigs.id, configId))

    return NextResponse.json({ success: true, message: "Config deleted successfully" })
  } catch (err) {
    console.error("Failed to delete config:", err)
    return apiError("Database error while deleting config", StatusCodes.INTERNAL_SERVER_ERROR)
  }
})
