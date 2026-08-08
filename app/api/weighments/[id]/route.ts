import { NextResponse } from "next/server"
import {
  withAuth,
  withEntityScope,
  apiError,
  formatEntityResponse,
  forbiddenError,
  hasPermission,
  isFKViolation,
  StatusCodes,
} from "@/db/helpers"
import { EntityKey, PermissionKey, ProjectSlug, TableName } from "@/lib/constants/enums"

export const GET = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.WEIGHMENTS, PermissionKey.READ))
      return forbiddenError()

    let query = client
      .from(TableName.WEIGHMENTS)
      .select(
        `*, centers!left(name, ${EntityKey.FACTORY_ID}), customers!left(name, govt_id), profiles!left(name, aadhar_number), rates!left(unit_price, unit, commodities!left(name))`
      )
      .eq("id", entityId)
      .eq(`centers.${EntityKey.FACTORY_ID}`, factoryId!)

    const { data: weighment, error } = await query.maybeSingle()
    if (error || !weighment) return apiError("Weighment not found", StatusCodes.NOT_FOUND)

    return formatEntityResponse(weighment)
  })
)

export const PATCH = withAuth(
  withEntityScope(async (req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.WEIGHMENTS, PermissionKey.WRITE))
      return forbiddenError()

    const { vehicle_number, weight, is_active } = await req.json()
    if (
      weight !== undefined &&
      !hasPermission(user, ProjectSlug.WEIGHMENTS, PermissionKey.EDIT_FIELD, EntityKey.WEIGHT)
    ) {
      return forbiddenError()
    }

    let query = client
      .from(TableName.WEIGHMENTS)
      .update({
        ...(vehicle_number ? { vehicle_number } : {}),
        ...(weight !== undefined ? { weight: String(weight) } : {}),
        ...(is_active !== undefined ? { is_active: Boolean(is_active) } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", entityId)
      .eq(EntityKey.FACTORY_ID, factoryId!)

    const { data: updated, error } = await query.select().maybeSingle()
    if (error || !updated) return apiError("Weighment not found", StatusCodes.NOT_FOUND)

    return formatEntityResponse(updated)
  })
)

export const PUT = PATCH

export const DELETE = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.WEIGHMENTS, PermissionKey.DELETE))
      return forbiddenError()

    try {
      let query = client
        .from(TableName.WEIGHMENTS)
        .delete()
        .eq("id", entityId)
        .eq(EntityKey.FACTORY_ID, factoryId!)

      const { data, error } = await query.select("id")
      if (error) {
        if (isFKViolation(error)) {
          return apiError(
            "Cannot delete this weighment because it is referenced by other records.",
            StatusCodes.BAD_REQUEST
          )
        }
        throw error
      }

      if (!data || data.length === 0) {
        return apiError("Weighment not found", StatusCodes.NOT_FOUND)
      }

      return NextResponse.json({ success: true, id: entityId })
    } catch (error) {
      if (isFKViolation(error)) {
        return apiError(
          "Cannot delete this weighment because it is referenced by other records.",
          StatusCodes.BAD_REQUEST
        )
      }
      throw error
    }
  })
)
