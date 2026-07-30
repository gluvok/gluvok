import { NextResponse } from "next/server"
import { eq, count, and, desc } from "drizzle-orm"
import { sharedSchema, standaloneSchema } from "@/db/schema"
import { withAuth, getPaginationParams, validateRequiredFields, forbiddenError, hasPermission, StatusCodes, apiError, formatEntityResponse } from "@/db/helpers"
import { Role, TenantMode, ProjectSlug, PermissionKey, FieldRequirementMode } from "@/lib/constants/enums"

export const GET = withAuth(async (req, user, db, mode) => {
  if (!hasPermission(user, ProjectSlug.CONFIGS, PermissionKey.READ)) return forbiddenError()

  const { page, limit, offset } = getPaginationParams(req.nextUrl)
  const factories = mode === TenantMode.SHARED ? sharedSchema.factories : undefined

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
      return NextResponse.json({
        data: row ? [row] : [],
        pagination: { page: 1, limit: 1, total: row ? 1 : 0 },
      })
    }

    // Shared mode — factory-scoped
    const sharedConfigs = sharedSchema.configs
    const conditions = []
    if (user.role !== Role.SUPER_ADMIN && user.factory_id != null) {
      conditions.push(eq(sharedConfigs.factoryId, user.factory_id))
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined
    const isSuperAdmin = user.role === Role.SUPER_ADMIN

    let baseQuery = db
      .select({
        id: sharedConfigs.id,
        factory_id: sharedConfigs.factoryId,
        aadhar_number_mode: sharedConfigs.aadharNumberMode,
        govt_id_mode: sharedConfigs.govtIdMode,
        created_at: sharedConfigs.createdAt,
        updated_at: sharedConfigs.updatedAt,
        ...(isSuperAdmin && factories ? { factory_name: factories.name } : {}),
      })
      .from(sharedConfigs)
      .$dynamic()

    if (isSuperAdmin && factories) {
      baseQuery = baseQuery.leftJoin(factories, eq(sharedConfigs.factoryId, factories.id)) as typeof baseQuery
    }

    const [totalCountResult, rows] = await Promise.all([
      db.select({ count: count() }).from(sharedConfigs).where(whereClause),
      baseQuery.where(whereClause).orderBy(desc(sharedConfigs.createdAt)).limit(limit).offset(offset),
    ])

    const total = Number(totalCountResult[0]?.count || 0)
    return NextResponse.json({
      data: rows,
      pagination: { page, limit, total },
    })
  } catch (err) {
    console.error("Failed to query configs table:", err)
    return NextResponse.json({
      data: [],
      pagination: { page, limit, total: 0 },
    })
  }
})

export const POST = withAuth(async (req, user, db, mode) => {
  if (!hasPermission(user, ProjectSlug.CONFIGS, PermissionKey.CREATE)) return forbiddenError()

  try {
    const body = await req.json()
    const err = validateRequiredFields(body, ProjectSlug.CONFIGS)
    if (err) return err

    const { aadhar_number_mode, govt_id_mode, factory_id } = body

    const validModes = Object.values(FieldRequirementMode)
    const aMode = validModes.includes(aadhar_number_mode) ? aadhar_number_mode : FieldRequirementMode.OPTIONAL
    const gMode = validModes.includes(govt_id_mode) ? govt_id_mode : FieldRequirementMode.OPTIONAL

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

    const targetFactoryId = user.role === Role.SUPER_ADMIN && factory_id ? Number(factory_id) : (user.factory_id ?? 0)
    if (!targetFactoryId) {
      return NextResponse.json({ error: "Factory ID is required" }, { status: StatusCodes.BAD_REQUEST })
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
