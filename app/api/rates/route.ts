import { NextResponse } from "next/server"
import { eq, count, and, desc } from "drizzle-orm"
import { db } from "@/db"
import { rates, commodities, factories } from "@/db/schema"
import { withAuth, getPaginationParams, validateRequiredFields, forbiddenError, hasPermission, StatusCodes } from "@/db/helpers"
import { Role, ProjectSlug, PermissionKey } from "@/lib/constants/enums"

export const GET = withAuth(async (req, user) => {
  const { page, limit, offset } = getPaginationParams(req.nextUrl)
  const conditions = []
  if (user.role !== Role.SUPER_ADMIN) conditions.push(eq(rates.factoryId, user.factory_id))
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [totalCountResult, rows] = await Promise.all([
    db.select({ count: count() }).from(rates).where(whereClause),
    db
      .select({
        id: rates.id,
        commodity_id: rates.commodityId,
        unit_price: rates.unitPrice,
        unit: rates.unit,
        factory_id: rates.factoryId,
        created_at: rates.createdAt,
        updated_at: rates.updatedAt,
        commodity_name: commodities.name,
        factory_name: factories.name,
      })
      .from(rates)
      .leftJoin(commodities, eq(rates.commodityId, commodities.id))
      .leftJoin(factories, eq(rates.factoryId, factories.id))
      .where(whereClause)
      .orderBy(desc(rates.createdAt))
      .limit(limit)
      .offset(offset),
  ])

  const total = Number(totalCountResult[0]?.count || 0)
  return NextResponse.json({
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

export const POST = withAuth(async (req, user) => {
  if (!hasPermission(user, ProjectSlug.RATES, PermissionKey.CREATE)) return forbiddenError()
  const body = await req.json()
  const err = validateRequiredFields(body, ProjectSlug.RATES)
  if (err) return err

  const { commodity_id, unit_price, unit, factory_id } = body
  const targetFactoryId = user.role === Role.SUPER_ADMIN && factory_id ? Number(factory_id) : user.factory_id

  const [newRate] = await db
    .insert(rates)
    .values({ commodityId: Number(commodity_id), unitPrice: String(unit_price), unit, factoryId: targetFactoryId })
    .returning()

  return NextResponse.json({
    data: {
      id: newRate.id,
      commodity_id: newRate.commodityId,
      unit_price: newRate.unitPrice,
      unit: newRate.unit,
      factory_id: newRate.factoryId,
      created_at: newRate.createdAt,
      updated_at: newRate.updatedAt,
    },
  }, { status: StatusCodes.CREATED })
})
