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
} from "@/lib/constants/enums"

export const GET = withAuth(async (req, user, client) => {
  const pagination = getPaginationParams(req.nextUrl)
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH)
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN) || "created_at"
  const sortDesc = req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true"

  let query = client
    .from(TableName.COMMODITIES)
    .select("*", { count: "exact" })
    .order(sortColumn, { ascending: !sortDesc })


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
  if (!hasPermission(user, ProjectSlug.COMMODITIES, PermissionKey.CREATE))
    return forbiddenError()
  const body = await req.json()
  const err = validateRequiredFields(body, ProjectSlug.COMMODITIES)
  if (err) return err

  const { name } = body
  const insertValues: Record<string, unknown> = {
    name,
  }

  const { data: newCommodity, error } = await client
    .from(TableName.COMMODITIES)
    .insert(insertValues)
    .select()
    .single()

  if (error) {
    console.error("POST commodity error:", error)
    return apiError(error.message || "Failed to create commodity", StatusCodes.BAD_REQUEST)
  }

  return formatEntityResponse(newCommodity, StatusCodes.CREATED)
})

export const DELETE = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.COMMODITIES, PermissionKey.DELETE))
    return forbiddenError()
  const ids = parseBulkIds(await req.json())
  if (!ids)
    return apiError(
      "Provide between 1 and 100 valid IDs",
      StatusCodes.BAD_REQUEST
    )

  try {
    let query = client.from(TableName.COMMODITIES).delete().in("id", ids)

    const { data, error } = await query.select("id")
    if (error) {
      if (isFKViolation(error)) {
        return apiError(
          "Cannot delete selected commodities because they are referenced by existing rates or weighments.",
          StatusCodes.BAD_REQUEST
        )
      }
      throw error
    }

    if (!data || data.length !== ids.length) {
      return apiError("One or more commodities were not found", StatusCodes.NOT_FOUND)
    }

    return NextResponse.json({ success: true, deleted_count: data.length })
  } catch (error) {
    if (isFKViolation(error)) {
      return apiError(
        "Cannot delete selected commodities because they are referenced by existing rates or weighments.",
        StatusCodes.BAD_REQUEST
      )
    }
    throw error
  }
})
