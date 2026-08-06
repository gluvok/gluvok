import { NextResponse } from "next/server"
import {
  withAuth,
  apiError,
  validateRequiredFields,
  forbiddenError,
  hasPermission,
  StatusCodes,
  formatEntityResponse,
  parseBulkIds,
  fetchPaginatedResult,
  getPaginationParams,
} from "@/db/helpers"
import { ProjectSlug, PermissionKey, FieldRequirementMode, QueryParam, TableName } from "@/lib/constants/enums"

export const GET = withAuth(async (req, user, client) => {
  try {
    const pagination = getPaginationParams(req.nextUrl)
    const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN) || "created_at"
    const sortDesc = req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true"

    let query = client
      .from(TableName.FACTORIES)
      .select("id, name, aadhar_number_mode, govt_id_mode, created_at, updated_at", { count: "exact" })
      .order(sortColumn, { ascending: !sortDesc })

    if (user.factory_id) {
      query = query.eq("id", user.factory_id)
    }

    return fetchPaginatedResult(query, pagination)
  } catch (err) {
    console.error("Failed to query factories/settings table:", err)
    return NextResponse.json({
      data: [],
      pagination: { page: 1, limit: 10, total: 0 },
    })
  }
})

export const POST = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.SETTINGS, PermissionKey.CREATE) && !hasPermission(user, ProjectSlug.SETTINGS, PermissionKey.WRITE)) {
    return forbiddenError()
  }

  try {
    const body = await req.json()
    const err = validateRequiredFields(body, ProjectSlug.SETTINGS)
    if (err) return err

    const { name, aadhar_number_mode, govt_id_mode } = body

    const validModes = Object.values(FieldRequirementMode)
    const aMode = validModes.includes(aadhar_number_mode) ? aadhar_number_mode : FieldRequirementMode.MANDATORY
    const gMode = validModes.includes(govt_id_mode) ? govt_id_mode : FieldRequirementMode.MANDATORY

    const targetFactoryId = user.factory_id

    if (targetFactoryId) {
      const { data: updated, error } = await client
        .from(TableName.FACTORIES)
        .update({
          ...(name ? { name } : {}),
          aadhar_number_mode: aMode,
          govt_id_mode: gMode,
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetFactoryId)
        .select()
        .single()

      if (error) throw error
      return formatEntityResponse(updated, StatusCodes.CREATED)
    } else {
      const { data: created, error } = await client
        .from(TableName.FACTORIES)
        .insert({
          name: name || "Default Factory",
          aadhar_number_mode: aMode,
          govt_id_mode: gMode,
        })
        .select()
        .single()

      if (error) throw error
      return formatEntityResponse(created, StatusCodes.CREATED)
    }
  } catch (err) {
    console.error("Failed to save setting:", err)
    return apiError("Failed to save configuration in database.", StatusCodes.INTERNAL_SERVER_ERROR)
  }
})

export const DELETE = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.SETTINGS, PermissionKey.DELETE))
    return forbiddenError()
  const ids = parseBulkIds(await req.json())
  if (!ids)
    return apiError(
      "Provide between 1 and 100 valid IDs",
      StatusCodes.BAD_REQUEST,
    )

  try {
    let query = client.from(TableName.FACTORIES).delete().in("id", ids)
    if (user.factory_id) {
      query = query.eq("id", user.factory_id)
    }

    const { data, error } = await query.select("id")
    if (error) throw error

    if (!data || data.length !== ids.length) {
      return apiError("One or more settings were not found", StatusCodes.NOT_FOUND)
    }

    return NextResponse.json({ success: true, deleted_count: data.length })
  } catch (error) {
    console.error("Delete settings error:", error)
    return apiError("Failed to delete selected setting(s)", StatusCodes.BAD_REQUEST)
  }
})
