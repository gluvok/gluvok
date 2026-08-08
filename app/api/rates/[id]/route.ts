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

export const GET = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.RATES, PermissionKey.READ))
      return forbiddenError()

    const query = client
      .from(TableName.RATES)
      .select(`*, ${TableName.COMMODITIES}!left(${EntityKey.NAME})`)
      .eq(EntityKey.ID, entityId)
      .eq(EntityKey.FACTORY_ID, factoryId!)

    const { data: rate, error } = await query.maybeSingle()
    if (error || !rate) return apiError(ApiErrorMessage.RATE_NOT_FOUND, StatusCodes.NOT_FOUND)

    return formatEntityResponse(rate)
  })
)

export const PATCH = withAuth(
  withEntityScope(async (req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.RATES, PermissionKey.WRITE))
      return forbiddenError()

    const { unit_price, unit, commodity_id } = await req.json()

    const query = client
      .from(TableName.RATES)
      .update({
        ...(unit_price ? { unit_price: String(unit_price) } : {}),
        ...(unit ? { unit } : {}),
        ...(commodity_id ? { commodity_id: Number(commodity_id) } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", entityId)
      .eq(EntityKey.FACTORY_ID, factoryId!)

    const { data: updated, error } = await query.select().maybeSingle()
    if (error || !updated) return apiError(ApiErrorMessage.RATE_NOT_FOUND, StatusCodes.NOT_FOUND)

    return formatEntityResponse(updated)
  })
)

export const DELETE = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.RATES, PermissionKey.DELETE))
      return forbiddenError()

    try {
      const query = client
        .from(TableName.RATES)
        .delete()
        .eq("id", entityId)
        .eq(EntityKey.FACTORY_ID, factoryId!)

      const { data, error } = await query.select("id")
      if (error) throw error

      if (!data || data.length === 0) {
        return apiError(ApiErrorMessage.RATE_NOT_FOUND, StatusCodes.NOT_FOUND)
      }

      return NextResponse.json({ success: true, id: entityId })
    } catch (error) {
      if (isFKViolation(error)) {
        return apiError(
          ApiErrorMessage.CANNOT_DELETE_RATE,
          StatusCodes.BAD_REQUEST
        )
      }
      throw error
    }
  })
)
