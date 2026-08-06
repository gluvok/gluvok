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
    if (!hasPermission(user, ProjectSlug.RATES, PermissionKey.READ))
      return forbiddenError()

    let query = client
      .from(TableName.RATES)
      .select("*, commodities!left(name)")
      .eq("id", entityId)

    if (factoryId) {
      query = query.eq("factory_id", factoryId)
    }

    const { data: rate, error } = await query.maybeSingle()
    if (error || !rate) return apiError("Rate not found", StatusCodes.NOT_FOUND)

    return formatEntityResponse(rate)
  })
)

export const PATCH = withAuth(
  withEntityScope(async (req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.RATES, PermissionKey.WRITE))
      return forbiddenError()

    const { unit_price, unit, commodity_id } = await req.json()

    let query = client
      .from(TableName.RATES)
      .update({
        ...(unit_price ? { unit_price: String(unit_price) } : {}),
        ...(unit ? { unit } : {}),
        ...(commodity_id ? { commodity_id: Number(commodity_id) } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", entityId)

    if (factoryId) {
      query = query.eq("factory_id", factoryId)
    }

    const { data: updated, error } = await query.select().maybeSingle()
    if (error || !updated) return apiError("Rate not found", StatusCodes.NOT_FOUND)

    return formatEntityResponse(updated)
  })
)

export const PUT = PATCH

export const DELETE = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.RATES, PermissionKey.DELETE))
      return forbiddenError()

    try {
      let query = client.from(TableName.RATES).delete().eq("id", entityId)
      if (factoryId) {
        query = query.eq("factory_id", factoryId)
      }

      const { data, error } = await query.select("id")
      if (error) {
        if (isFKViolation(error)) {
          return apiError(
            "Cannot delete this rate because it is referenced by existing weighments.",
            StatusCodes.BAD_REQUEST
          )
        }
        throw error
      }

      if (!data || data.length === 0) {
        return apiError("Rate not found", StatusCodes.NOT_FOUND)
      }

      return NextResponse.json({ success: true, id: entityId })
    } catch (error) {
      if (isFKViolation(error)) {
        return apiError(
          "Cannot delete this rate because it is referenced by existing weighments.",
          StatusCodes.BAD_REQUEST
        )
      }
      throw error
    }
  })
)
