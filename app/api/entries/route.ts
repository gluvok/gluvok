import { NextResponse } from "next/server"
import {
  withAuth,
  getPaginationParams,
  apiError,
  StatusCodes,
  fetchPaginatedResult,
} from "@/db/helpers"
import {
  TableName,
  EntityKey,
  QueryParam,
  EntryStatus,
  FilterValue,
} from "@/lib/constants/enums"
import { validateSequentialApproval, tryMergeEntries } from "@/lib/services/weighments"

export const GET = withAuth(async (req, user, client) => {
  const pagination = getPaginationParams(req.nextUrl)
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH)
  const statusParam = req.nextUrl.searchParams.get(EntityKey.STATUS)
  const centerIdParam = req.nextUrl.searchParams.get(EntityKey.CENTER_ID)
  const profileIdParam = req.nextUrl.searchParams.get(EntityKey.PROFILE_ID)
  const customerIdParam = req.nextUrl.searchParams.get(EntityKey.CUSTOMER_ID)
  const startDateParam = req.nextUrl.searchParams.get(QueryParam.START_DATE)
  const endDateParam = req.nextUrl.searchParams.get(QueryParam.END_DATE)
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN) || EntityKey.CREATED_AT
  const sortDesc = req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true"

  let query = client
    .from(TableName.ENTRIES)
    .select(
      `*, ${TableName.CENTERS}(${EntityKey.NAME}), ${TableName.PROFILES}(${EntityKey.NAME}), ${TableName.CUSTOMERS}(${EntityKey.NAME})`,
      { count: "exact" }
    )
    .eq(EntityKey.FACTORY_ID, user.factory_id!)
    .order(sortColumn, { ascending: !sortDesc })

  if (statusParam && statusParam !== FilterValue.ALL) {
    query = query.eq(EntityKey.STATUS, statusParam)
  }

  if (centerIdParam && centerIdParam !== FilterValue.ALL) {
    query = query.eq(EntityKey.CENTER_ID, Number(centerIdParam))
  }

  if (profileIdParam && profileIdParam !== FilterValue.ALL) {
    query = query.eq(EntityKey.PROFILE_ID, Number(profileIdParam))
  }

  if (customerIdParam && customerIdParam !== FilterValue.ALL) {
    query = query.eq(EntityKey.CUSTOMER_ID, Number(customerIdParam))
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
        `${EntityKey.VEHICLE_NUMBER}.ilike.%${search}%,${EntityKey.DETECTED_VEHICLE_NUMBER}.ilike.%${search}%,${EntityKey.ID}.eq.${searchNum}`
      )
    } else {
      query = query.or(
        `${EntityKey.VEHICLE_NUMBER}.ilike.%${search}%,${EntityKey.DETECTED_VEHICLE_NUMBER}.ilike.%${search}%`
      )
    }
  }

  return fetchPaginatedResult(query, pagination)
})

export const POST = withAuth(async (req, user, client) => {
  try {
    const deviceSecret = req.headers.get("x-microcontroller-secret")
    const expectedSecret = process.env.MICROCONTROLLER_SECRET || "default-pi-secret-key"

    if (deviceSecret !== expectedSecret) {
      return apiError(
        "Access denied: Invalid or missing microcontroller device secret.",
        StatusCodes.FORBIDDEN
      )
    }

    const body = await req.json()
    const {
      detected_vehicle_number,
      vehicle_number,
      weight,
      center_id,
      profile_id,
      customer_id,
      status = EntryStatus.PENDING,
      images = [],
    } = body

    if (!detected_vehicle_number || !vehicle_number || weight === undefined || !center_id || !profile_id) {
      return apiError("Missing required entry fields.", StatusCodes.BAD_REQUEST)
    }

    const nowStr = new Date().toISOString()

    if (status === EntryStatus.APPROVED) {
      await validateSequentialApproval(
        client,
        user.factory_id!,
        vehicle_number,
        nowStr,
        0
      )
    }

    const { data: newEntry, error: insertErr } = await client
      .from(TableName.ENTRIES)
      .insert({
        [EntityKey.DETECTED_VEHICLE_NUMBER]: detected_vehicle_number,
        [EntityKey.VEHICLE_NUMBER]: vehicle_number,
        [EntityKey.WEIGHT]: Number(weight),
        [EntityKey.CENTER_ID]: Number(center_id),
        [EntityKey.PROFILE_ID]: Number(profile_id),
        [EntityKey.CUSTOMER_ID]: customer_id ? Number(customer_id) : null,
        [EntityKey.FACTORY_ID]: user.factory_id!,
        [EntityKey.STATUS]: status,
        [EntityKey.IMAGES]: images,
        [EntityKey.CREATED_AT]: nowStr,
        [EntityKey.UPDATED_AT]: nowStr,
      })
      .select("*")
      .single()

    if (insertErr || !newEntry) {
      console.error("Failed to insert entry:", insertErr)
      return apiError("Failed to create entry.", StatusCodes.INTERNAL_SERVER_ERROR)
    }

    if (status === EntryStatus.APPROVED) {
      await tryMergeEntries(client, user.factory_id!, newEntry.id)
    }

    return NextResponse.json({ data: newEntry }, { status: StatusCodes.CREATED })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to process entry creation."
    return apiError(msg, StatusCodes.BAD_REQUEST)
  }
})
