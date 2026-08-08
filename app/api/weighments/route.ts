import { NextResponse } from "next/server"
import {
  withAuth,
  getPaginationParams,
  apiError,
  forbiddenError,
  hasPermission,
  StatusCodes,
  fetchPaginatedResult,
  formatEntityResponse,
  isFKViolation,
  parseBulkIds,
  validateRequiredFields,
} from "@/db/helpers"
import {
  Unit,
  WeighmentType,
  ProjectSlug,
  PermissionKey,
  QueryParam,
  EntityKey,
  FilterValue,
  TableName,
} from "@/lib/constants/enums"

export const GET = withAuth(async (req, user, client) => {
  const pagination = getPaginationParams(req.nextUrl)
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH)
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN) || "created_at"
  const sortDesc = req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true"
  const unitParam = req.nextUrl.searchParams.get(EntityKey.UNIT)
  const centerIdParam = req.nextUrl.searchParams.get(EntityKey.CENTER_ID)
  const commodityIdParam = req.nextUrl.searchParams.get(EntityKey.COMMODITY_ID)
  const typeParam = req.nextUrl.searchParams.get(EntityKey.TYPE)
  const isActiveParam = req.nextUrl.searchParams.get(EntityKey.IS_ACTIVE)
  const startDateParam = req.nextUrl.searchParams.get(QueryParam.START_DATE)
  const endDateParam = req.nextUrl.searchParams.get(QueryParam.END_DATE)

  let query = client
    .from(TableName.WEIGHMENTS)
    .select(
      `*, centers!left(name, ${EntityKey.FACTORY_ID}), customers!left(name, govt_id), profiles!left(name, aadhar_number), rates!left(unit_price, unit, commodities!left(name))`,
      { count: "exact" }
    )
    .order(sortColumn, { ascending: !sortDesc })
    .eq(`centers.${EntityKey.FACTORY_ID}`, user.factory_id!)

  if (unitParam && unitParam !== FilterValue.ALL) {
    query = query.eq("unit", unitParam)
  }
  if (centerIdParam && centerIdParam !== FilterValue.ALL) {
    query = query.eq("center_id", Number(centerIdParam))
  }
  if (commodityIdParam && commodityIdParam !== FilterValue.ALL) {
    query = query.eq("rates.commodity_id", Number(commodityIdParam))
  }
  if (typeParam && typeParam !== FilterValue.ALL) {
    query = query.eq("type", typeParam)
  }
  if (isActiveParam && isActiveParam !== FilterValue.ALL) {
    query = query.eq("is_active", isActiveParam === "true")
  }
  if (startDateParam) {
    query = query.gte("created_at", startDateParam)
  }
  if (endDateParam) {
    query = query.lte("created_at", endDateParam)
  }

  if (search) {
    query = query.or(`vehicle_number.ilike.%${search}%`)
  }

  return fetchPaginatedResult(query, pagination)
})

export const POST = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.WEIGHMENTS, PermissionKey.CREATE))
    return forbiddenError()
  const body = await req.json()
  const err = validateRequiredFields(body, ProjectSlug.WEIGHMENTS)
  if (err) return err

  const {
    vehicle_number,
    weight,
    unit,
    type,
    rate_id,
    center_id,
    profile_id,
    customer_id,
    images,
  } = body

  const profileId = user.profile_id ?? Number(profile_id)
  if (!Number.isSafeInteger(profileId) || profileId <= 0) {
    return apiError("profile_id is required", StatusCodes.BAD_REQUEST)
  }
  if (user.profile_id != null && user.role !== "operator") {
    return forbiddenError()
  }

  const centerQuery = client
    .from(TableName.CENTERS)
    .select(`id, ${EntityKey.FACTORY_ID}`)
    .eq("id", Number(center_id))

  const { data: center } = await centerQuery.maybeSingle()
  if (!center)
    return apiError("Selected center not found", StatusCodes.NOT_FOUND)

  if (center.factory_id !== user.factory_id) {
    return forbiddenError()
  }

  const insertValues = {
    vehicle_number,
    weight: String(weight),
    unit: unit || Unit.KG,
    type: type || WeighmentType.IN,
    rate_id: rate_id === "" || rate_id === null || rate_id === undefined ? null : Number(rate_id),
    center_id: Number(center_id),
    profile_id: profileId,
    customer_id: customer_id === "" || customer_id === null || customer_id === undefined ? null : Number(customer_id),
    images: images || [],
    [EntityKey.FACTORY_ID]: user.factory_id!,
  }

  const { data: newWeighment, error } = await client
    .from(TableName.WEIGHMENTS)
    .insert(insertValues)
    .select()
    .single()

  if (error) {
    console.error("POST weighment error:", error)
    return apiError(error.message || "Failed to create weighment", StatusCodes.BAD_REQUEST)
  }

  return formatEntityResponse(newWeighment, StatusCodes.CREATED)
})

export const DELETE = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.WEIGHMENTS, PermissionKey.DELETE))
    return forbiddenError()
  const ids = parseBulkIds(await req.json())
  if (!ids)
    return apiError(
      "Provide between 1 and 100 valid IDs",
      StatusCodes.BAD_REQUEST
    )

  try {
    let query = client.from(TableName.WEIGHMENTS).delete().in("id", ids).eq(EntityKey.FACTORY_ID, user.factory_id!)

    const { data, error } = await query.select("id")
    if (error) {
      if (isFKViolation(error)) {
        return apiError(
          "Cannot delete selected weighments because they are referenced by other records.",
          StatusCodes.BAD_REQUEST
        )
      }
      throw error
    }

    if (!data || data.length !== ids.length) {
      return apiError("One or more weighments were not found", StatusCodes.NOT_FOUND)
    }

    return NextResponse.json({ success: true, deleted_count: data.length })
  } catch (error) {
    if (isFKViolation(error)) {
      return apiError(
        "Cannot delete selected weighments because they are referenced by other records.",
        StatusCodes.BAD_REQUEST
      )
    }
    throw error
  }
})
