import { NextResponse } from "next/server"
import { eq, and, desc } from "drizzle-orm"
import { sharedSchema, standaloneSchema } from "@/db/schema"
import { withAuth, validateRequiredFields, forbiddenError, hasPermission, StatusCodes, apiError, formatEntityResponse, getFactoryWhereClause } from "@/db/helpers"
import { TenantMode, ProjectSlug, PermissionKey, FieldRequirementMode } from "@/lib/constants/enums"

export const GET = withAuth(async (req, user, db, mode) => {
  try {
    if (mode === TenantMode.DEDICATED) {
      // Single global config — no factory scoping
      const [row] = await db
        .select({
          id: standaloneSchema.configs.id,
          aadhar_number_mode: standaloneSchema.configs.aadharNumberMode,
          govt_id_mode: standaloneSchema.configs.govtIdMode,
          created_at: standaloneSchema.configs.createdAt,
          updated_at: standaloneSchema.configs.updatedAt,
        })
        .from(standaloneSchema.configs)
        .limit(1)
      const data = row ? [row] : []
      return NextResponse.json({
        data,
        pagination: { page: 1, limit: 100, total: data.length },
      })
    }

    // Shared mode — factory-scoped
    const sharedConfigs = sharedSchema.configs
    const factoryCond = getFactoryWhereClause(user, mode, sharedConfigs.factoryId)
    const conditions = []
    if (factoryCond) conditions.push(factoryCond)
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const rows = await db
      .select({
        id: sharedConfigs.id,
        factory_id: sharedConfigs.factoryId,
        aadhar_number_mode: sharedConfigs.aadharNumberMode,
        govt_id_mode: sharedConfigs.govtIdMode,
        created_at: sharedConfigs.createdAt,
        updated_at: sharedConfigs.updatedAt,
      })
      .from(sharedConfigs)
      .where(whereClause)
      .orderBy(desc(sharedConfigs.createdAt))

    return NextResponse.json({
      data: rows,
      pagination: { page: 1, limit: rows.length || 10, total: rows.length },
    })
  } catch (err) {
    console.error("Failed to query configs table:", err)
    return NextResponse.json({
      data: [],
      pagination: { page: 1, limit: 10, total: 0 },
    })
  }
})

/**
 * POST /api/configs
 * Creates configuration resource.
 * Rules:
 * - Dedicated mode: no factory_id needed.
 * - Shared mode: factory_id is derived automatically from user.factory_id.
 */
export const POST = withAuth(async (req, user, db, mode) => {
  if (!hasPermission(user, ProjectSlug.CONFIGS, PermissionKey.CREATE) && !hasPermission(user, ProjectSlug.CONFIGS, PermissionKey.WRITE)) {
    return forbiddenError()
  }

  try {
    const body = await req.json()
    const err = validateRequiredFields(body, ProjectSlug.CONFIGS)
    if (err) return err

    const { aadhar_number_mode, govt_id_mode } = body

    const validModes = Object.values(FieldRequirementMode)
    const aMode = validModes.includes(aadhar_number_mode) ? aadhar_number_mode : FieldRequirementMode.MANDATORY
    const gMode = validModes.includes(govt_id_mode) ? govt_id_mode : FieldRequirementMode.MANDATORY

    // 1. Dedicated Mode
    if (mode === TenantMode.DEDICATED) {
      const [existing] = await db.select({ id: standaloneSchema.configs.id }).from(standaloneSchema.configs).limit(1)
      let newConfig
      if (existing) {
        ;[newConfig] = await db
          .update(standaloneSchema.configs)
          .set({ aadharNumberMode: aMode, govtIdMode: gMode, updatedAt: new Date() })
          .where(eq(standaloneSchema.configs.id, existing.id))
          .returning()
      } else {
        ;[newConfig] = await db
          .insert(standaloneSchema.configs)
          .values({ aadharNumberMode: aMode, govtIdMode: gMode })
          .returning()
      }
      return formatEntityResponse(newConfig, mode, StatusCodes.CREATED)
    }

    // 2. Shared Mode
    const targetFactoryId = user.factory_id ?? 0
    if (!targetFactoryId || targetFactoryId <= 0) {
      return apiError("User is not associated with a factory", StatusCodes.BAD_REQUEST)
    }

    const [newConfig] = await db
      .insert(sharedSchema.configs)
      .values({ factoryId: targetFactoryId, aadharNumberMode: aMode, govtIdMode: gMode })
      .onConflictDoUpdate({
        target: sharedSchema.configs.factoryId,
        set: { aadharNumberMode: aMode, govtIdMode: gMode, updatedAt: new Date() },
      })
      .returning()

    return formatEntityResponse(newConfig, mode, StatusCodes.CREATED)
  } catch (err) {
    console.error("Failed to save config:", err)
    return apiError("Failed to save configuration in database. Ensure the configs table exists.", StatusCodes.INTERNAL_SERVER_ERROR)
  }
})

export const PUT = POST
