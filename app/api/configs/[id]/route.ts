import { NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@/db"
import { configs } from "@/db/schema"
import { withAuth, apiError, forbiddenError, hasPermission, StatusCodes } from "@/db/helpers"
import { Role, ProjectSlug, PermissionKey, FieldRequirementMode } from "@/lib/constants/enums"

export const PATCH = withAuth(async (req, user, context) => {
  if (!hasPermission(user, ProjectSlug.CONFIGS, PermissionKey.WRITE)) return forbiddenError()

  try {
    const params = await context.params
    const configId = Number(params.id)
    if (!configId) return apiError("Config not found", StatusCodes.NOT_FOUND)

    const body = await req.json()
    const { aadhar_number_mode, govt_id_mode } = body

    const conditions = [eq(configs.id, configId)]
    if (user.role !== Role.SUPER_ADMIN && user.factory_id != null) {
      conditions.push(eq(configs.factoryId, user.factory_id))
    }

    const [existing] = await db
      .select()
      .from(configs)
      .where(and(...conditions))
      .limit(1)

    if (!existing) return apiError("Config not found", StatusCodes.NOT_FOUND)

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    const validModes = Object.values(FieldRequirementMode)
    if (aadhar_number_mode && validModes.includes(aadhar_number_mode)) {
      updates.aadharNumberMode = aadhar_number_mode
    }
    if (govt_id_mode && validModes.includes(govt_id_mode)) {
      updates.govtIdMode = govt_id_mode
    }

    const [updated] = await db
      .update(configs)
      .set(updates)
      .where(eq(configs.id, configId))
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

export const DELETE = withAuth(async (_req, user, context) => {
  if (!hasPermission(user, ProjectSlug.CONFIGS, PermissionKey.DELETE)) return forbiddenError()

  try {
    const params = await context.params
    const configId = Number(params.id)
    if (!configId) return apiError("Config not found", StatusCodes.NOT_FOUND)

    const conditions = [eq(configs.id, configId)]
    if (user.role !== Role.SUPER_ADMIN && user.factory_id != null) {
      conditions.push(eq(configs.factoryId, user.factory_id))
    }

    const [existing] = await db
      .select()
      .from(configs)
      .where(and(...conditions))
      .limit(1)

    if (!existing) return apiError("Config not found", StatusCodes.NOT_FOUND)

    await db.delete(configs).where(eq(configs.id, configId))

    return NextResponse.json({ success: true, message: "Config deleted successfully" })
  } catch (err) {
    console.error("Failed to delete config:", err)
    return apiError("Database error while deleting config", StatusCodes.INTERNAL_SERVER_ERROR)
  }
})
