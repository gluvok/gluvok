import { NextResponse } from "next/server"
import { eq, count, and, desc } from "drizzle-orm"
import { db } from "@/db"
import { rates, commodities, factories } from "@/db/schema"
import { withAuth, getPaginationParams, apiError, forbiddenError, hasPermission, StatusCodes } from "@/db/helpers"
import { Role, ProjectSlug, PermissionKey } from "@/lib/constants/enums"

export const GET = withAuth(async (req, user) => {
  const { page, limit, offset } = getPaginationParams(req.nextUrl)
  const conditions = []
  if (user.role !== Role.SUPER_ADMIN) conditions.push(eq(rates.factoryId, user.factory_id))
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [totalCountResult] = await db.select({ count: count() }).from(rates).where(whereClause)
  const rows = await db
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
    .offset(offset)

  const total = Number(totalCountResult?.count || 0)
  return NextResponse.json({
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

export const POST = withAuth(async (req, user) => {
  if (!hasPermission(user, ProjectSlug.RATES, PermissionKey.CREATE)) return forbiddenError()
  const body = await req.json()
  const { commodityId, commodity_id, unitPrice, unit_price, unit, factoryId, factory_id } = body

  const targetCommodityId = commodityId ?? commodity_id
  const targetUnitPrice = unitPrice ?? unit_price
  if (!targetCommodityId || !targetUnitPrice || !unit) {
    return apiError("commodity_id, unit_price, and unit are required", StatusCodes.BAD_REQUEST)
  }

  const rawFactoryId = factoryId ?? factory_id
  const targetFactoryId = user.role === Role.SUPER_ADMIN && rawFactoryId ? Number(rawFactoryId) : user.factory_id

  const [newRate] = await db
    .insert(rates)
    .values({ commodityId: Number(targetCommodityId), unitPrice: String(targetUnitPrice), unit, factoryId: targetFactoryId })
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
