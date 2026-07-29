import { NextResponse } from "next/server"
import { eq, count, and, desc } from "drizzle-orm"
import { db } from "@/db"
import { configs, factories } from "@/db/schema"
import { withAuth, getPaginationParams, validateRequiredFields, forbiddenError, hasPermission, StatusCodes, apiError } from "@/db/helpers"
import { Role, ProjectSlug, PermissionKey, FieldRequirementMode } from "@/lib/constants/enums"

export const GET = withAuth(async (req, user) => {
  if (!hasPermission(user, ProjectSlug.CONFIGS, PermissionKey.READ)) return forbiddenError()

  const { page, limit, offset } = getPaginationParams(req.nextUrl)

  try {
    const conditions = []
    if (user.role !== Role.SUPER_ADMIN && user.factory_id != null) {
      conditions.push(eq(configs.factoryId, user.factory_id))
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const isSuperAdmin = user.role === Role.SUPER_ADMIN

    let baseQuery = db
      .select({
        id: configs.id,
        factory_id: configs.factoryId,
        aadhar_number_mode: configs.aadharNumberMode,
        govt_id_mode: configs.govtIdMode,
        created_at: configs.createdAt,
        updated_at: configs.updatedAt,
        ...(isSuperAdmin ? { factory_name: factories.name } : {}),
      })
      .from(configs)
      .$dynamic()

    if (isSuperAdmin) {
      baseQuery = baseQuery.leftJoin(factories, eq(configs.factoryId, factories.id)) as typeof baseQuery
    }

    const [totalCountResult, rows] = await Promise.all([
      db.select({ count: count() }).from(configs).where(whereClause),
      baseQuery.where(whereClause).orderBy(desc(configs.createdAt)).limit(limit).offset(offset),
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

export const POST = withAuth(async (req, user) => {
  if (!hasPermission(user, ProjectSlug.CONFIGS, PermissionKey.CREATE)) return forbiddenError()

  try {
    const body = await req.json()
    const err = validateRequiredFields(body, ProjectSlug.CONFIGS)
    if (err) return err

    const { factory_id, aadhar_number_mode, govt_id_mode } = body
    const targetFactoryId = user.role === Role.SUPER_ADMIN && factory_id ? Number(factory_id) : (user.factory_id ?? 0)

    if (!targetFactoryId) {
      return NextResponse.json({ error: "Factory ID is required" }, { status: StatusCodes.BAD_REQUEST })
    }

    const validModes = Object.values(FieldRequirementMode)
    const aMode = validModes.includes(aadhar_number_mode) ? aadhar_number_mode : FieldRequirementMode.OPTIONAL
    const gMode = validModes.includes(govt_id_mode) ? govt_id_mode : FieldRequirementMode.OPTIONAL

    const [newConfig] = await db
      .insert(configs)
      .values({
        factoryId: targetFactoryId,
        aadharNumberMode: aMode,
        govtIdMode: gMode,
      })
      .onConflictDoUpdate({
        target: configs.factoryId,
        set: {
          aadharNumberMode: aMode,
          govtIdMode: gMode,
          updatedAt: new Date(),
        },
      })
      .returning()

    return NextResponse.json(
      {
        data: {
          id: newConfig.id,
          factory_id: newConfig.factoryId,
          aadhar_number_mode: newConfig.aadharNumberMode,
          govt_id_mode: newConfig.govtIdMode,
          created_at: newConfig.createdAt,
          updated_at: newConfig.updatedAt,
        },
      },
      { status: StatusCodes.CREATED }
    )
  } catch (err) {
    console.error("Failed to save config:", err)
    return apiError("Failed to save configuration in database. Ensure the configs table exists.", StatusCodes.INTERNAL_SERVER_ERROR)
  }
})
