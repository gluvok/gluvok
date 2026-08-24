import { NextResponse } from "next/server"
import {
  withAuth,
  apiError,
  getPaginationParams,
  validateRequiredFields,
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
  QueryParam,
  PermissionKey,
  TableName,
  EntityKey,
} from "@/lib/constants/enums"
import { ApiErrorMessage } from "@/lib/constants/messages"

export const GET = withAuth(async (req, user, client) => {
  const pagination = getPaginationParams(req.nextUrl)
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH)
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN) || "created_at"
  const sortDesc = req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true"

  let query = client
    .from(TableName.CENTERS)
    .select("*", { count: "exact" })
    .order(sortColumn, { ascending: !sortDesc })
    .eq(EntityKey.FACTORY_ID, user.factory_id!)

  if (search) {
    const searchNum = parseInt(search, 10)
    if (!isNaN(searchNum)) {
      query = query.or(`name.ilike.%${search}%,id.eq.${searchNum}`)
    } else {
      query = query.ilike("name", `%${search}%`)
    }
  }

  return fetchPaginatedResult(query, pagination)
})

export const POST = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.CENTERS, PermissionKey.CREATE))
    return forbiddenError()
  const body = await req.json()
  const err = validateRequiredFields(body, ProjectSlug.CENTERS)
  if (err) return err

  const { name } = body
  const insertValues: Record<string, unknown> = {
    name,
    [EntityKey.FACTORY_ID]: user.factory_id,
  }

  const { data: newCenter, error } = await client
    .from(TableName.CENTERS)
    .insert(insertValues)
    .select()
    .single()

  if (error) {
    console.error("POST center error:", error)
    return apiError(error.message || ApiErrorMessage.CREATE_CENTER_FAILED, StatusCodes.BAD_REQUEST)
  }

  return formatEntityResponse(newCenter, StatusCodes.CREATED)
})

export const DELETE = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.CENTERS, PermissionKey.DELETE))
    return forbiddenError()
  const ids = parseBulkIds(await req.json())
  if (!ids)
    return apiError(
      ApiErrorMessage.PROVIDE_VALID_IDS,
      StatusCodes.BAD_REQUEST
    )

  // Check if any entries are linked to any of the selected centers
  const { data: linkedEntries } = await client
    .from(TableName.ENTRIES)
    .select(EntityKey.ID)
    .in(EntityKey.CENTER_ID, ids)
    .limit(1)

  if (linkedEntries && linkedEntries.length > 0) {
    return apiError(ApiErrorMessage.CANNOT_DELETE_SELECTED_CENTERS, StatusCodes.BAD_REQUEST)
  }

  try {
    const query = client.from(TableName.CENTERS).delete().in(EntityKey.ID, ids).eq(EntityKey.FACTORY_ID, user.factory_id!)

    const { data, error } = await query.select("id")
    if (error) throw error

    if (!data || data.length !== ids.length) {
      return apiError(ApiErrorMessage.ONE_OR_MORE_CENTERS_NOT_FOUND, StatusCodes.NOT_FOUND)
    }

    return NextResponse.json({ success: true, deleted_count: data.length })
  } catch (error) {
    if (isFKViolation(error)) {
      return apiError(
        ApiErrorMessage.CANNOT_DELETE_SELECTED_CENTERS,
        StatusCodes.BAD_REQUEST
      )
    }
    throw error
  }
})
