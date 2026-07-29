import { NextResponse } from "next/server"
import { eq, ilike, count, and, desc, or } from "drizzle-orm"
import { db } from "@/db"
import { weighments, rates, commodities, centers, profiles, customers } from "@/db/schema"
import { withAuth, getPaginationParams, validateRequiredFields, apiError, forbiddenError, hasPermission, StatusCodes } from "@/db/helpers"
import { Role, ProjectSlug, PermissionKey, QueryParam, Unit, WeighmentType, EntityKey, FilterValue } from "@/lib/constants/enums"

export const GET = withAuth(async (req, user) => {
  const { page, limit, offset } = getPaginationParams(req.nextUrl)
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH)
  const centerIdParam = req.nextUrl.searchParams.get(EntityKey.CENTER_ID)
  const commodityIdParam = req.nextUrl.searchParams.get(EntityKey.COMMODITY_ID)
  const typeParam = req.nextUrl.searchParams.get(EntityKey.TYPE)
  const isActiveParam = req.nextUrl.searchParams.get(EntityKey.IS_ACTIVE)

  const conditions = []
  if (user.role !== Role.SUPER_ADMIN) conditions.push(eq(centers.factoryId, user.factory_id != null ? user.factory_id : 0))
  if (centerIdParam && centerIdParam !== FilterValue.ALL) conditions.push(eq(weighments.centerId, Number(centerIdParam)))
  if (commodityIdParam && commodityIdParam !== FilterValue.ALL) conditions.push(eq(rates.commodityId, Number(commodityIdParam)))
  if (typeParam && typeParam !== FilterValue.ALL) conditions.push(eq(weighments.type, typeParam as WeighmentType))
  if (isActiveParam && isActiveParam !== FilterValue.ALL) conditions.push(eq(weighments.isActive, isActiveParam === "true"))
  if (search) {
    conditions.push(
      or(
        ilike(weighments.vehicleNumber, `%${search}%`),
        ilike(customers.name, `%${search}%`),
        ilike(profiles.name, `%${search}%`),
        ilike(centers.name, `%${search}%`)
      )
    )
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [totalCountResult, rows] = await Promise.all([
    db
      .select({ count: count() })
      .from(weighments)
      .leftJoin(centers, eq(weighments.centerId, centers.id))
      .leftJoin(customers, eq(weighments.customerId, customers.id))
      .leftJoin(profiles, eq(weighments.profileId, profiles.id))
      .where(whereClause),
    db
      .select({
        id: weighments.id,
        vehicle_number: weighments.vehicleNumber,
        weight: weighments.weight,
        images: weighments.images,
        unit: weighments.unit,
        type: weighments.type,
        rate_id: weighments.rateId,
        center_id: weighments.centerId,
        profile_id: weighments.profileId,
        customer_id: weighments.customerId,
        is_active: weighments.isActive,
        created_at: weighments.createdAt,
        updated_at: weighments.updatedAt,
        center_name: centers.name,
        profile_name: profiles.name,
        customer_name: customers.name,
        commodity_name: commodities.name,
        unit_price: rates.unitPrice,
      })
      .from(weighments)
      .leftJoin(rates, eq(weighments.rateId, rates.id))
      .leftJoin(commodities, eq(rates.commodityId, commodities.id))
      .leftJoin(centers, eq(weighments.centerId, centers.id))
      .leftJoin(profiles, eq(weighments.profileId, profiles.id))
      .leftJoin(customers, eq(weighments.customerId, customers.id))
      .where(whereClause)
      .orderBy(desc(weighments.createdAt))
      .limit(limit)
      .offset(offset),
  ])

  const total = Number(totalCountResult[0]?.count || 0)
  return NextResponse.json({
    data: rows,
    pagination: { page, limit, total },
  })
})

export const POST = withAuth(async (req, user) => {
  if (!hasPermission(user, ProjectSlug.WEIGHMENTS, PermissionKey.CREATE)) return forbiddenError()
  const body = await req.json()
  const err = validateRequiredFields(body, ProjectSlug.WEIGHMENTS)
  if (err) return err

  const { vehicle_number, weight, unit, type, rate_id, center_id, profile_id, customer_id, images } = body

  // Ensure center belongs to user's factory if non-super_admin
  const [center] = await db.select({ factoryId: centers.factoryId }).from(centers).where(eq(centers.id, Number(center_id)))
  if (!center) return apiError("Selected center not found", StatusCodes.NOT_FOUND)
  if (user.role !== Role.SUPER_ADMIN && center.factoryId !== user.factory_id != null ? user.factory_id : 0) {
    return forbiddenError()
  }

  const [newWeighment] = await db
    .insert(weighments)
    .values({
      vehicleNumber: vehicle_number,
      weight: String(weight),
      unit: unit || Unit.KG,
      type: type || WeighmentType.IN,
      rateId: Number(rate_id),
      centerId: Number(center_id),
      profileId: Number(profile_id),
      customerId: Number(customer_id),
      images: images || [],
    })
    .returning()

  return NextResponse.json({
    data: {
      id: newWeighment.id,
      vehicle_number: newWeighment.vehicleNumber,
      weight: newWeighment.weight,
      unit: newWeighment.unit,
      type: newWeighment.type,
      rate_id: newWeighment.rateId,
      center_id: newWeighment.centerId,
      profile_id: newWeighment.profileId,
      customer_id: newWeighment.customerId,
      images: newWeighment.images,
      is_active: newWeighment.isActive,
      created_at: newWeighment.createdAt,
      updated_at: newWeighment.updatedAt,
    },
  }, { status: StatusCodes.CREATED })
})

