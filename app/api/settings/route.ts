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
import { ProjectSlug, PermissionKey, FieldRequirementMode, QueryParam, TableName, EntityKey } from "@/lib/constants/enums"
import { ApiErrorMessage } from "@/lib/constants/messages"

export const GET = withAuth(async (req, user, client) => {
  try {
    const pagination = getPaginationParams(req.nextUrl)
    const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN) || EntityKey.CREATED_AT
    const sortDesc = req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true"

    const query = client
      .from(TableName.FACTORIES)
      .select("id, name, aadhar_number_mode, govt_id_mode, created_at, updated_at", { count: "exact" })
      .order(sortColumn, { ascending: !sortDesc })
      .eq(EntityKey.ID, user.factory_id!)

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

    const targetFactoryId = user.factory_id!

    const { data: updated, error } = await client
      .from(TableName.FACTORIES)
      .update({
        ...(name ? { name } : {}),
        aadhar_number_mode: aMode,
        govt_id_mode: gMode,
        updated_at: new Date().toISOString(),
      })
      .eq(EntityKey.ID, targetFactoryId)
      .select()
      .single()

    if (error) throw error
    return formatEntityResponse(updated, StatusCodes.CREATED)
  } catch (err) {
    console.error("Failed to save setting:", err)
    return apiError(ApiErrorMessage.SAVE_CONFIGURATION_FAILED, StatusCodes.INTERNAL_SERVER_ERROR)
  }
})

export const DELETE = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.SETTINGS, PermissionKey.DELETE))
    return forbiddenError()
  const ids = parseBulkIds(await req.json())
  if (!ids)
    return apiError(
      ApiErrorMessage.PROVIDE_VALID_IDS,
      StatusCodes.BAD_REQUEST,
    )

  try {
    const query = client
      .from(TableName.FACTORIES)
      .delete()
      .in(EntityKey.ID, ids)
      .eq(EntityKey.ID, user.factory_id!)

    const { data, error } = await query.select(EntityKey.ID)
    if (error) throw error

    if (!data || data.length !== ids.length) {
      return apiError(ApiErrorMessage.ONE_OR_MORE_SETTINGS_NOT_FOUND, StatusCodes.NOT_FOUND)
    }

    return NextResponse.json({ success: true, deleted_count: data.length })
  } catch (error) {
    console.error("Delete settings error:", error)
    return apiError(ApiErrorMessage.DELETE_SETTINGS_FAILED, StatusCodes.BAD_REQUEST)
  }
})
