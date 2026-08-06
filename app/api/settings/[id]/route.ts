import { NextResponse } from "next/server"
import {
  withAuth,
  withEntityScope,
  apiError,
  forbiddenError,
  hasPermission,
  StatusCodes,
  formatEntityResponse,
} from "@/db/helpers"
import { ProjectSlug, PermissionKey, FieldRequirementMode, TableName } from "@/lib/constants/enums"

export const GET = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.SETTINGS, PermissionKey.READ))
      return forbiddenError()

    let query = client
      .from(TableName.FACTORIES)
      .select("id, name, aadhar_number_mode, govt_id_mode, created_at, updated_at")
      .eq("id", entityId)

    if (factoryId) {
      query = query.eq("id", factoryId)
    }

    const { data: setting, error } = await query.maybeSingle()
    if (error || !setting) return apiError("Setting not found", StatusCodes.NOT_FOUND)

    return formatEntityResponse(setting)
  })
)

export const PUT = withAuth(
  withEntityScope(async (req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.SETTINGS, PermissionKey.WRITE))
      return forbiddenError()

    const body = await req.json()
    const { name, aadhar_number_mode, govt_id_mode } = body

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (name !== undefined) updatePayload.name = name
    if (aadhar_number_mode !== undefined) {
      const validModes = Object.values(FieldRequirementMode)
      updatePayload.aadhar_number_mode = validModes.includes(aadhar_number_mode)
        ? aadhar_number_mode
        : FieldRequirementMode.MANDATORY
    }
    if (govt_id_mode !== undefined) {
      const validModes = Object.values(FieldRequirementMode)
      updatePayload.govt_id_mode = validModes.includes(govt_id_mode)
        ? govt_id_mode
        : FieldRequirementMode.MANDATORY
    }

    let query = client
      .from(TableName.FACTORIES)
      .update(updatePayload)
      .eq("id", entityId)

    if (factoryId) {
      query = query.eq("id", factoryId)
    }

    const { data: updated, error } = await query.select().maybeSingle()
    if (error || !updated) return apiError("Setting not found", StatusCodes.NOT_FOUND)

    return formatEntityResponse(updated)
  })
)

export const PATCH = PUT

export const DELETE = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.SETTINGS, PermissionKey.DELETE))
      return forbiddenError()

    let query = client.from(TableName.FACTORIES).delete().eq("id", entityId)
    if (factoryId) {
      query = query.eq("id", factoryId)
    }

    const { data, error } = await query.select("id")
    if (error || !data || data.length === 0) {
      return apiError("Setting not found", StatusCodes.NOT_FOUND)
    }

    return NextResponse.json({ success: true, id: entityId })
  })
)
