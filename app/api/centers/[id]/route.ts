import { NextResponse } from "next/server"
import {
  withAuth,
  withEntityScope,
  apiError,
  isFKViolation,
  forbiddenError,
  hasPermission,
  StatusCodes,
  formatEntityResponse,
} from "@/db/helpers"
import { ProjectSlug, PermissionKey, TableName } from "@/lib/constants/enums"

export const GET = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.CENTERS, PermissionKey.READ))
      return forbiddenError()

    let query = client.from(TableName.CENTERS).select("*").eq("id", entityId)
    if (factoryId) {
      query = query.eq("factory_id", factoryId)
    }

    const { data: center, error } = await query.maybeSingle()
    if (error || !center) return apiError("Center not found", StatusCodes.NOT_FOUND)

    return formatEntityResponse(center)
  })
)

export const PATCH = withAuth(
  withEntityScope(async (req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.CENTERS, PermissionKey.WRITE))
      return forbiddenError()

    const { name } = await req.json()

    let query = client
      .from(TableName.CENTERS)
      .update({
        ...(name ? { name } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", entityId)

    if (factoryId) {
      query = query.eq("factory_id", factoryId)
    }

    const { data: updated, error } = await query.select().maybeSingle()
    if (error || !updated) return apiError("Center not found", StatusCodes.NOT_FOUND)

    return formatEntityResponse(updated)
  })
)

export const PUT = PATCH

export const DELETE = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.CENTERS, PermissionKey.DELETE))
      return forbiddenError()

    try {
      let query = client.from(TableName.CENTERS).delete().eq("id", entityId)
      if (factoryId) {
        query = query.eq("factory_id", factoryId)
      }

      const { data, error } = await query.select("id")
      if (error) {
        if (isFKViolation(error)) {
          return apiError(
            "Cannot delete this center because it is referenced by existing weighments.",
            StatusCodes.BAD_REQUEST
          )
        }
        throw error
      }

      if (!data || data.length === 0) {
        return apiError("Center not found", StatusCodes.NOT_FOUND)
      }

      return NextResponse.json({ success: true, id: entityId })
    } catch (error) {
      if (isFKViolation(error)) {
        return apiError(
          "Cannot delete this center because it is referenced by existing weighments.",
          StatusCodes.BAD_REQUEST
        )
      }
      throw error
    }
  })
)
