import { NextResponse } from "next/server"
import {
  withAuth,
  getPaginationParams,
  apiError,
  StatusCodes,
} from "@/db/helpers"
import {
  QueryParam,
  EntityKey,
  TableName,
  RelationAlias,
  FilterValue,
  WeighmentType,
  Unit,
} from "@/lib/constants/enums"

export const GET = withAuth(async (req, user, client) => {
  const pagination = getPaginationParams(req.nextUrl)
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH)
  const typeParam = req.nextUrl.searchParams.get(EntityKey.TYPE)
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN) || EntityKey.CREATED_AT
  const sortDesc = req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true"
  const startDateParam = req.nextUrl.searchParams.get(QueryParam.START_DATE)
  const endDateParam = req.nextUrl.searchParams.get(QueryParam.END_DATE)

  // Query weighments joined with in_entry and out_entry and their related centers, users, customers
  let query = client
    .from(TableName.WEIGHMENTS)
    .select(
      `*, ${RelationAlias.IN_ENTRY}:${TableName.ENTRIES}!in_entry_id(*, ${TableName.CENTERS}(${EntityKey.NAME}), ${TableName.USERS}(${EntityKey.NAME}), ${TableName.CUSTOMERS}(${EntityKey.NAME})), ${RelationAlias.OUT_ENTRY}:${TableName.ENTRIES}!out_entry_id(*, ${TableName.CENTERS}(${EntityKey.NAME}), ${TableName.USERS}(${EntityKey.NAME}), ${TableName.CUSTOMERS}(${EntityKey.NAME}))`,
      { count: "exact" }
    )
    .eq(`${RelationAlias.IN_ENTRY}.${EntityKey.FACTORY_ID}`, user.factory_id!)

  if (typeParam && typeParam !== FilterValue.ALL) {
    query = query.eq(EntityKey.TYPE, typeParam)
  }

  if (startDateParam) {
    query = query.gte(EntityKey.CREATED_AT, startDateParam)
  }

  if (endDateParam) {
    query = query.lte(EntityKey.CREATED_AT, endDateParam)
  }

  if (search) {
    const searchNum = parseInt(search, 10)
    if (!isNaN(searchNum)) {
      query = query.or(
        `${EntityKey.IN_ENTRY_ID}.eq.${searchNum},${EntityKey.OUT_ENTRY_ID}.eq.${searchNum},${RelationAlias.IN_ENTRY}.${EntityKey.VEHICLE_NUMBER}.ilike.%${search}%`
      )
    } else {
      query = query.or(`${RelationAlias.IN_ENTRY}.${EntityKey.VEHICLE_NUMBER}.ilike.%${search}%`)
    }
  }

  // Non-deprecated PostgreSQL ordering (including Computed Columns: gross_weight, tare_weight, net_weight)
  if (
    sortColumn === EntityKey.CREATED_AT ||
    sortColumn === EntityKey.ID ||
    sortColumn === EntityKey.UNIT ||
    sortColumn === EntityKey.IN_ENTRY_ID ||
    sortColumn === EntityKey.OUT_ENTRY_ID ||
    sortColumn === EntityKey.GROSS_WEIGHT ||
    sortColumn === EntityKey.TARE_WEIGHT ||
    sortColumn === EntityKey.NET_WEIGHT
  ) {
    query = query.order(sortColumn, { ascending: !sortDesc })
  } else if (sortColumn === EntityKey.IN_ENTRY_CREATED_AT) {
    query = query.order(`${RelationAlias.IN_ENTRY}.${EntityKey.CREATED_AT}`, { ascending: !sortDesc })
  } else if (sortColumn === EntityKey.OUT_ENTRY_CREATED_AT) {
    query = query.order(`${RelationAlias.OUT_ENTRY}.${EntityKey.CREATED_AT}`, { ascending: !sortDesc })
  } else {
    query = query.order(EntityKey.CREATED_AT, { ascending: false })
  }

  const { page, limit, offset } = pagination
  const { data, count, error } = await query.range(offset, offset + limit - 1)

  if (error) {
    console.error("Supabase query error:", error)
    return apiError(error.message || "Database query failed", StatusCodes.INTERNAL_SERVER_ERROR)
  }

  // Format response rows with computed derived fields
  const formattedData = (data || []).map((row: Record<string, unknown>) => {
    const inEntry = (row[RelationAlias.IN_ENTRY] as Record<string, unknown>) || {}
    const outEntry = (row[RelationAlias.OUT_ENTRY] as Record<string, unknown>) || {}

    const inWeight = Number(inEntry.weight || 0)
    const outWeight = Number(outEntry.weight || 0)

    const grossWeight = Math.max(inWeight, outWeight)
    const tareWeight = Math.min(inWeight, outWeight)
    const netWeight = grossWeight - tareWeight

    const inImages = Array.isArray(inEntry.images) ? (inEntry.images as string[]) : []
    const outImages = Array.isArray(outEntry.images) ? (outEntry.images as string[]) : []
    const combinedImages = Array.from(new Set([...inImages, ...outImages]))

    const inCenters = inEntry.centers as Record<string, unknown> | undefined
    const outCenters = outEntry.centers as Record<string, unknown> | undefined
    const inUsers = inEntry.users as Record<string, unknown> | undefined
    const outUsers = outEntry.users as Record<string, unknown> | undefined
    const inCustomers = inEntry.customers as Record<string, unknown> | undefined
    const outCustomers = outEntry.customers as Record<string, unknown> | undefined

    return {
      [EntityKey.ID]: row.id,
      [EntityKey.UNIT]: row.unit || Unit.KG,
      [EntityKey.TYPE]: row.type || WeighmentType.UNASSIGNED,
      [EntityKey.GROSS_WEIGHT]: grossWeight,
      [EntityKey.TARE_WEIGHT]: tareWeight,
      [EntityKey.NET_WEIGHT]: netWeight,
      [EntityKey.IMAGES]: combinedImages,
      [EntityKey.IN_ENTRY_ID]: row.in_entry_id,
      [EntityKey.IN_ENTRY_CREATED_AT]: inEntry.created_at,
      [EntityKey.OUT_ENTRY_ID]: row.out_entry_id,
      [EntityKey.OUT_ENTRY_CREATED_AT]: outEntry.created_at,
      [EntityKey.IN_CENTER_ID]: inEntry.center_id,
      [EntityKey.IN_CENTER_NAME]: inCenters?.name || "",
      [EntityKey.OUT_CENTER_ID]: outEntry.center_id,
      [EntityKey.OUT_CENTER_NAME]: outCenters?.name || "",
      [EntityKey.IN_PROFILE_ID]: inEntry.user_id,
      [EntityKey.IN_PROFILE_NAME]: inUsers?.name || "",
      [EntityKey.OUT_PROFILE_ID]: outEntry.user_id,
      [EntityKey.OUT_PROFILE_NAME]: outUsers?.name || "",
      [EntityKey.IN_CUSTOMER_ID]: inEntry.customer_id,
      [EntityKey.IN_CUSTOMER_NAME]: inCustomers?.name || "",
      [EntityKey.OUT_CUSTOMER_ID]: outEntry.customer_id,
      [EntityKey.OUT_CUSTOMER_NAME]: outCustomers?.name || "",
      [EntityKey.VEHICLE_NUMBER]: inEntry.vehicle_number || outEntry.vehicle_number || "",
      [EntityKey.CREATED_AT]: row.created_at,
      [EntityKey.UPDATED_AT]: row.updated_at,
    }
  })

  const total = count ?? formattedData.length
  return NextResponse.json({
    data: formattedData,
    pagination: { page, limit, total },
  })
})
