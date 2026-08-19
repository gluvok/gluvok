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
  EntryType,
  FilterValue,
} from "@/lib/constants/enums"
import { validateSequentialApproval, tryMergeEntries } from "@/lib/services/weighments"

export const GET = withAuth(async (req, user, client) => {
  const pagination = getPaginationParams(req.nextUrl)
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH)
  const statusParam = req.nextUrl.searchParams.get(EntityKey.STATUS)
  const typeParam = req.nextUrl.searchParams.get(EntityKey.TYPE)
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

  if (typeParam && typeParam !== FilterValue.ALL) {
    query = query.eq(EntityKey.TYPE, typeParam)
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
    const body = await req.json()
    const {
      vehicle_number,
      weight,
      center_id,
      customer_id,
      status = EntryStatus.PENDING,
      images = [],
    } = body

    if (!vehicle_number || weight === undefined || weight === null || weight === "") {
      return apiError("Vehicle number and weight are required.", StatusCodes.BAD_REQUEST)
    }

    if (!center_id) {
      return apiError("Center ID is required.", StatusCodes.BAD_REQUEST)
    }

    // Verify center_id belongs to the user's factory
    const { data: centerRecord } = await client
      .from(TableName.CENTERS)
      .select(EntityKey.ID)
      .eq(EntityKey.ID, Number(center_id))
      .eq(EntityKey.FACTORY_ID, user.factory_id!)
      .maybeSingle()

    if (!centerRecord) {
      return apiError("Invalid center ID or center does not belong to user factory.", StatusCodes.FORBIDDEN)
    }

    const profileId = user.profile_id
    if (!profileId) {
      return apiError("Profile ID not found in user session.", StatusCodes.UNAUTHORIZED)
    }

    const nowStr = new Date().toISOString()

    if (status === EntryStatus.APPROVED) {
      await validateSequentialApproval(
        client,
        user.factory_id!,
        vehicle_number,
        nowStr,
        0,
        EntryType.MANUAL
      )
    }

    const { data: newEntry, error: insertErr } = await client
      .from(TableName.ENTRIES)
      .insert({
        [EntityKey.DETECTED_VEHICLE_NUMBER]: null,
        [EntityKey.VEHICLE_NUMBER]: vehicle_number,
        [EntityKey.WEIGHT]: Number(weight),
        [EntityKey.TYPE]: EntryType.MANUAL,
        [EntityKey.CENTER_ID]: Number(center_id),
        [EntityKey.PROFILE_ID]: profileId,
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
      console.error("Failed to insert manual entry:", insertErr)
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
