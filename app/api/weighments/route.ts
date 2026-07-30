import { eq, ilike, and, desc, or, gte, lte, count } from "drizzle-orm"
import { weighments, rates, commodities, centers, profiles, customers, sharedSchema } from "@/db/schema"
import { withAuth, getPaginationParams, validateRequiredFields, apiError, forbiddenError, hasPermission, StatusCodes, getFactoryWhereClause, fetchPaginatedResult, formatEntityResponse } from "@/db/helpers"
import { Role, TenantMode, ProjectSlug, PermissionKey, QueryParam, Unit, WeighmentType, EntityKey, FilterValue } from "@/lib/constants/enums"

export const GET = withAuth(async (req, user, db, mode) => {
  const pagination = getPaginationParams(req.nextUrl)
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH)
  const unitParam = req.nextUrl.searchParams.get(EntityKey.UNIT)
  const centerIdParam = req.nextUrl.searchParams.get(EntityKey.CENTER_ID)
  const commodityIdParam = req.nextUrl.searchParams.get(EntityKey.COMMODITY_ID)
  const typeParam = req.nextUrl.searchParams.get(EntityKey.TYPE)
  const isActiveParam = req.nextUrl.searchParams.get(EntityKey.IS_ACTIVE)
  const startDateParam = req.nextUrl.searchParams.get(QueryParam.START_DATE)
  const endDateParam = req.nextUrl.searchParams.get(QueryParam.END_DATE)

  const factoryCond = getFactoryWhereClause(user, mode, sharedSchema.centers.factoryId)
  const conditions = []
  if (factoryCond) conditions.push(factoryCond)
  if (unitParam && unitParam !== FilterValue.ALL) conditions.push(eq(weighments.unit, unitParam as Unit))
  if (centerIdParam && centerIdParam !== FilterValue.ALL) conditions.push(eq(weighments.centerId, Number(centerIdParam)))
  if (commodityIdParam && commodityIdParam !== FilterValue.ALL) conditions.push(eq(rates.commodityId, Number(commodityIdParam)))
  if (typeParam && typeParam !== FilterValue.ALL) conditions.push(eq(weighments.type, typeParam as WeighmentType))
  if (isActiveParam && isActiveParam !== FilterValue.ALL) conditions.push(eq(weighments.isActive, isActiveParam === "true"))
  if (startDateParam) conditions.push(gte(weighments.createdAt, new Date(startDateParam)))
  if (endDateParam) conditions.push(lte(weighments.createdAt, new Date(endDateParam)))
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

  const countQuery = db
    .select({ count: count() })
    .from(weighments)
    .leftJoin(centers, eq(weighments.centerId, centers.id))
    .leftJoin(customers, eq(weighments.customerId, customers.id))
    .leftJoin(profiles, eq(weighments.profileId, profiles.id))

  const baseQuery = db
    .select({
      id: weighments.id,
      vehicle_number: weighments.vehicleNumber,
      weight: weighments.weight,
      unit: weighments.unit,
      type: weighments.type,
      rate_id: weighments.rateId,
      center_id: weighments.centerId,
      profile_id: weighments.profileId,
      customer_id: weighments.customerId,
      is_active: weighments.isActive,
      images: weighments.images,
      created_at: weighments.createdAt,
      updated_at: weighments.updatedAt,
      commodity_name: commodities.name,
      center_name: centers.name,
      profile_name: profiles.name,
      customer_name: customers.name,
    })
    .from(weighments)
    .leftJoin(rates, eq(weighments.rateId, rates.id))
    .leftJoin(commodities, eq(rates.commodityId, commodities.id))
    .leftJoin(centers, eq(weighments.centerId, centers.id))
    .leftJoin(profiles, eq(weighments.profileId, profiles.id))
    .leftJoin(customers, eq(weighments.customerId, customers.id))

  return fetchPaginatedResult(db, countQuery, baseQuery, whereClause, pagination, desc(weighments.createdAt))
})

export const POST = withAuth(async (req, user, db, mode) => {
  if (!hasPermission(user, ProjectSlug.WEIGHMENTS, PermissionKey.CREATE)) return forbiddenError()
  const body = await req.json()
  const err = validateRequiredFields(body, ProjectSlug.WEIGHMENTS)
  if (err) return err

  const { vehicle_number, weight, unit, type, rate_id, center_id, profile_id, customer_id, images } = body

  // Ensure center belongs to user's factory if non-super_admin in shared mode
  const [center] = await db
    .select(mode === TenantMode.SHARED ? { factoryId: sharedSchema.centers.factoryId } : { id: centers.id })
    .from(centers)
    .where(eq(centers.id, Number(center_id)))
  if (!center) return apiError("Selected center not found", StatusCodes.NOT_FOUND)
  if (mode === TenantMode.SHARED && user.role !== Role.SUPER_ADMIN) {
    const c = center as { factoryId: number }
    if (c.factoryId !== user.factory_id) return forbiddenError()
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

  return formatEntityResponse(newWeighment, mode, StatusCodes.CREATED)
})
