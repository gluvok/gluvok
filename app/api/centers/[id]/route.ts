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
import { ProjectSlug, PermissionKey, TableName, EntityKey } from "@/lib/constants/enums"
import { ApiErrorMessage } from "@/lib/constants/messages"

export const PATCH = withAuth(
  withEntityScope(async (req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.CENTERS, PermissionKey.WRITE))
      return forbiddenError()

    const { name } = await req.json()

    const query = client
      .from(TableName.CENTERS)
      .update({
        ...(name ? { name } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq(EntityKey.ID, entityId)
      .eq(EntityKey.FACTORY_ID, factoryId!)

    const { data: updated, error } = await query.select().maybeSingle()
    if (error || !updated) return apiError(ApiErrorMessage.CENTER_NOT_FOUND, StatusCodes.NOT_FOUND)

    return formatEntityResponse(updated)
  })
)

export const DELETE = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.CENTERS, PermissionKey.DELETE))
      return forbiddenError()

    try {
      const query = client
        .from(TableName.CENTERS)
        .delete()
        .eq("id", entityId)
        .eq(EntityKey.FACTORY_ID, factoryId!)

      const { data, error } = await query.select("id")
      if (error) throw error

      if (!data || data.length === 0) {
        return apiError(ApiErrorMessage.CENTER_NOT_FOUND, StatusCodes.NOT_FOUND)
      }

      return NextResponse.json({ success: true, id: entityId })
    } catch (error) {
      if (isFKViolation(error)) {
        return apiError(
          ApiErrorMessage.CANNOT_DELETE_CENTER,
          StatusCodes.BAD_REQUEST
        )
      }
      throw error
    }
  })
)
