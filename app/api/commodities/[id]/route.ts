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
  withEntityScope(async (_req, user, client, _ctx, { entityId }) => {
    if (!hasPermission(user, ProjectSlug.COMMODITIES, PermissionKey.READ))
      return forbiddenError()

    let query = client.from(TableName.COMMODITIES).select("*").eq("id", entityId)

    const { data: commodity, error } = await query.maybeSingle()
    if (error || !commodity) return apiError("Commodity not found", StatusCodes.NOT_FOUND)

    return formatEntityResponse(commodity)
  })
)

export const PATCH = withAuth(
  withEntityScope(async (req, user, client, _ctx, { entityId }) => {
    if (!hasPermission(user, ProjectSlug.COMMODITIES, PermissionKey.WRITE))
      return forbiddenError()

    const { name } = await req.json()

    let query = client
      .from(TableName.COMMODITIES)
      .update({
        ...(name ? { name } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", entityId)

    const { data: updated, error } = await query.select().maybeSingle()
    if (error || !updated) return apiError("Commodity not found", StatusCodes.NOT_FOUND)

    return formatEntityResponse(updated)
  })
)

export const PUT = PATCH

export const DELETE = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId }) => {
    if (!hasPermission(user, ProjectSlug.COMMODITIES, PermissionKey.DELETE))
      return forbiddenError()

    try {
      let query = client.from(TableName.COMMODITIES).delete().eq("id", entityId)

      const { data, error } = await query.select("id")
      if (error) {
        if (isFKViolation(error)) {
          return apiError(
            "Cannot delete this commodity because it is referenced by existing rates or weighments.",
            StatusCodes.BAD_REQUEST
          )
        }
        throw error
      }

      if (!data || data.length === 0) {
        return apiError("Commodity not found", StatusCodes.NOT_FOUND)
      }

      return NextResponse.json({ success: true, id: entityId })
    } catch (error) {
      if (isFKViolation(error)) {
        return apiError(
          "Cannot delete this commodity because it is referenced by existing rates or weighments.",
          StatusCodes.BAD_REQUEST
        )
      }
      throw error
    }
  })
)
