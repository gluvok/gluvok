import { NextResponse } from "next/server"
import {
  withAuth,
  getPaginationParams,
  validateRequiredFields,
  apiError,
  forbiddenError,
  hasPermission,
  StatusCodes,
  fetchPaginatedResult,
  formatEntityResponse,
  isFKViolation,
  parseBulkIds,
} from "@/db/helpers"
import {
  ProjectSlug,
  PermissionKey,
  EntityKey,
  FilterValue,
  QueryParam,
  TableName,
} from "@/lib/constants/enums"

export const GET = withAuth(async (req, user, client) => {
  const pagination = getPaginationParams(req.nextUrl)
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH)
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN) || "created_at"
  const sortDesc = req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true"
  const commodityIdParam = req.nextUrl.searchParams.get(EntityKey.COMMODITY_ID)
  const unitParam = req.nextUrl.searchParams.get(EntityKey.UNIT)
  const startDateParam = req.nextUrl.searchParams.get(QueryParam.START_DATE)
  const endDateParam = req.nextUrl.searchParams.get(QueryParam.END_DATE)

  let query = client
    .from(TableName.RATES)
    .select("*, commodities!left(name)", { count: "exact" })
    .order(sortColumn, { ascending: !sortDesc })
    .eq(EntityKey.FACTORY_ID, user.factory_id!)

  if (commodityIdParam && commodityIdParam !== FilterValue.ALL) {
    query = query.eq("commodity_id", Number(commodityIdParam))
  }
  if (unitParam && unitParam !== FilterValue.ALL) {
    query = query.eq("unit", unitParam)
  }
  if (startDateParam) {
    query = query.gte("created_at", startDateParam)
  }
  if (endDateParam) {
    query = query.lte("created_at", endDateParam)
  }

  if (search) {
    const searchNum = parseInt(search, 10)
    if (!isNaN(searchNum)) {
      query = query.or(`unit_price.ilike.%${search}%,id.eq.${searchNum}`)
    } else {
      query = query.ilike("unit_price", `%${search}%`)
    }
  }

  return fetchPaginatedResult(query, pagination)
})

export const POST = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.RATES, PermissionKey.CREATE))
    return forbiddenError()
  const body = await req.json()
  const err = validateRequiredFields(body, ProjectSlug.RATES)
  if (err) return err

  const { commodity_id, unit_price, unit } = body
  const insertValues: Record<string, unknown> = {
    commodity_id: Number(commodity_id),
    unit_price: String(unit_price),
    unit,
    [EntityKey.FACTORY_ID]: user.factory_id!,
  }

  const { data: newRate, error } = await client
    .from(TableName.RATES)
    .insert(insertValues)
    .select()
    .single()

  if (error) {
    console.error("POST rate error:", error)
    return apiError(error.message || "Failed to create rate", StatusCodes.BAD_REQUEST)
  }

  return formatEntityResponse(newRate, StatusCodes.CREATED)
})

export const DELETE = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.RATES, PermissionKey.DELETE))
    return forbiddenError()
  const ids = parseBulkIds(await req.json())
  if (!ids)
    return apiError(
      "Provide between 1 and 100 valid IDs",
      StatusCodes.BAD_REQUEST
    )

  try {
    let query = client.from(TableName.RATES).delete().in("id", ids).eq(EntityKey.FACTORY_ID, user.factory_id!)

    const { data, error } = await query.select("id")
    if (error) throw error

    if (!data || data.length !== ids.length) {
      return apiError("One or more rates were not found", StatusCodes.NOT_FOUND)
    }

    return NextResponse.json({ success: true, deleted_count: data.length })
  } catch (error) {
    if (isFKViolation(error)) {
      return apiError(
        "Cannot delete selected rates because they are referenced by existing weighments.",
        StatusCodes.BAD_REQUEST
      )
    }
    throw error
  }
})
