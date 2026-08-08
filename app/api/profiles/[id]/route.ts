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
  getFactoryConfig,
} from "@/db/helpers"
import { getDynamicProfileSchema } from "@/lib/validation"
import { hashPassword } from "@/lib/auth/password"
import {
  PermissionKey,
  ProjectSlug,
  Role,
  TableName,
  EntityKey,
} from "@/lib/constants/enums"
import { ApiErrorMessage } from "@/lib/constants/messages"

export const GET = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.PROFILES, PermissionKey.READ))
      return forbiddenError()

    const query = client
      .from(TableName.PROFILES)
      .select("*, users!inner(username, is_active, factory_id)")
      .eq("id", entityId)
      .eq(`users.${EntityKey.FACTORY_ID}`, factoryId!)

    const { data: profile, error } = await query.maybeSingle()
    if (error || !profile) return apiError(ApiErrorMessage.PROFILE_NOT_FOUND, StatusCodes.NOT_FOUND)

    return formatEntityResponse(profile)
  })
)

export const PATCH = withAuth(
  withEntityScope(async (req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.PROFILES, PermissionKey.WRITE))
      return forbiddenError()

    const existingQuery = client
      .from(TableName.PROFILES)
      .select("id, user_id, name, users!inner(username, is_active, factory_id)")
      .eq("id", entityId)
      .eq(`users.${EntityKey.FACTORY_ID}`, factoryId!)

    const { data: existing } = await existingQuery.maybeSingle()
    if (!existing) return apiError(ApiErrorMessage.PROFILE_NOT_FOUND, StatusCodes.NOT_FOUND)

    const body = await req.json()
    const activeConfig = await getFactoryConfig(user.factory_id)
    const dynamicSchema = getDynamicProfileSchema(activeConfig, true)
    const parsed = dynamicSchema.safeParse(body)

    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST)
    }

    const { name, password, role, is_active } = body
    const validRole =
      role && Object.values(Role).includes(role as Role)
        ? (role as Role)
        : undefined

    const { data: updated, error: updateErr } = await client
      .from(TableName.PROFILES)
      .update({
        ...(name && typeof name === "string" && name.trim().length > 0
          ? { name: name.trim() }
          : {}),
        ...(validRole ? { role: validRole } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", entityId)
      .select()
      .maybeSingle()

    if (updateErr || !updated) return apiError(ApiErrorMessage.PROFILE_NOT_FOUND, StatusCodes.NOT_FOUND)

    const userUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (password && typeof password === "string" && password.trim().length > 0) {
      userUpdates.password_hash = await hashPassword(password.trim())
    }
    if (validRole) {
      userUpdates.role = validRole
    }
    if (is_active !== undefined) {
      userUpdates.is_active = Boolean(is_active)
    }

    let updatedUserIsActive = (existing.users as unknown as { is_active?: boolean })?.is_active
    if (Object.keys(userUpdates).length > 1) {
      const { data: updatedUser } = await client
        .from(TableName.USERS)
        .update(userUpdates)
        .eq("id", updated.user_id)
        .select("is_active")
        .maybeSingle()

      if (updatedUser) {
        updatedUserIsActive = updatedUser.is_active
      }
    }

    const rawUsers = existing.users as unknown as { username?: string; factory_id?: number } | null
    return formatEntityResponse({
      ...updated,
      is_active: updatedUserIsActive,
      username: rawUsers?.username,
      [EntityKey.FACTORY_ID]: rawUsers?.factory_id,
    })
  })
)

export const DELETE = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.PROFILES, PermissionKey.DELETE))
      return forbiddenError()

    try {
      const existingQuery = client
        .from(TableName.PROFILES)
        .select("id, user_id, users!inner(factory_id)")
        .eq("id", entityId)
        .eq(`users.${EntityKey.FACTORY_ID}`, factoryId!)

      const { data: existing } = await existingQuery.maybeSingle()
      if (!existing) return apiError(ApiErrorMessage.PROFILE_NOT_FOUND, StatusCodes.NOT_FOUND)

      const { data, error } = await client
        .from(TableName.PROFILES)
        .delete()
        .eq("id", entityId)
        .select("id")

      if (error) throw error

      if (!data || data.length === 0) {
        return apiError(ApiErrorMessage.PROFILE_NOT_FOUND, StatusCodes.NOT_FOUND)
      }

      return NextResponse.json({ success: true, id: entityId })
    } catch (error) {
      if (isFKViolation(error)) {
        return apiError(
          ApiErrorMessage.CANNOT_DELETE_PROFILE,
          StatusCodes.BAD_REQUEST
        )
      }
      throw error
    }
  })
)
