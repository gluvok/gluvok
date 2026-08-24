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
  getFactory,
} from "@/db/helpers";
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

export const PATCH = withAuth(
  withEntityScope(async (req, user, client, _ctx, { entityId, factoryId }) => {
    const existingQuery = client
      .from(TableName.PROFILES)
      .select(`${EntityKey.ID}, ${EntityKey.USER_ID}, ${EntityKey.NAME}, ${TableName.USERS}!inner(${EntityKey.USERNAME}, ${EntityKey.IS_ACTIVE}, ${EntityKey.FACTORY_ID})`)
      .eq(EntityKey.ID, entityId)
      .eq(`${TableName.USERS}.${EntityKey.FACTORY_ID}`, factoryId!)

    const { data: existing } = await existingQuery.maybeSingle()
    if (!existing) return apiError(ApiErrorMessage.PROFILE_NOT_FOUND, StatusCodes.NOT_FOUND)

    const isOwn =
      (existing.user_id != null && String(existing.user_id) === String(user.sub)) ||
      (user.profile_id != null && user.profile_id === entityId)

    if (!isOwn && !hasPermission(user, ProjectSlug.PROFILES, PermissionKey.WRITE)) {
      return forbiddenError()
    }

    const body = await req.json()
    const factory = await getFactory(client, user.factory_id);
    const dynamicSchema = getDynamicProfileSchema(factory, true);
    const parsed = dynamicSchema.safeParse(body)

    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST)
    }

    const { name, aadhar_number, password, role, is_active } = body
    const validRole =
      role && Object.values(Role).includes(role as Role)
        ? (role as Role)
        : undefined

    let passwordHash: string | null = null
    if (password && typeof password === "string" && password.trim().length > 0) {
      passwordHash = await hashPassword(password.trim())
    }

    const { data: updated, error } = await client.rpc("update_profile_with_user", {
      p_profile_id: entityId,
      p_factory_id: factoryId!,
      p_name: name && typeof name === "string" && name.trim().length > 0 ? name.trim() : null,
      p_role: validRole || null,
      p_aadhar_number: aadhar_number != null ? String(aadhar_number) : null,
      p_password_hash: passwordHash,
      p_is_active: is_active !== undefined ? Boolean(is_active) : null,
    })

    if (error || !updated) {
      return apiError(error?.message || ApiErrorMessage.PROFILE_NOT_FOUND, StatusCodes.NOT_FOUND)
    }

    return formatEntityResponse(updated)
  })
)

export const DELETE = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    const existingQuery = client
      .from(TableName.PROFILES)
      .select(`${EntityKey.ID}, ${EntityKey.USER_ID}`)
      .eq(EntityKey.ID, entityId)
      .eq(EntityKey.FACTORY_ID, factoryId!)

    const { data: existing } = await existingQuery.maybeSingle()
    if (!existing) return apiError(ApiErrorMessage.PROFILE_NOT_FOUND, StatusCodes.NOT_FOUND)

    const isOwn =
      (existing.user_id != null && String(existing.user_id) === String(user.sub)) ||
      (user.profile_id != null && user.profile_id === entityId)

    if (!isOwn && !hasPermission(user, ProjectSlug.PROFILES, PermissionKey.DELETE)) {
      return forbiddenError()
    }

    // Check if any entries are linked to this profile
    const { data: linkedEntry } = await client
      .from(TableName.ENTRIES)
      .select(EntityKey.ID)
      .eq(EntityKey.PROFILE_ID, entityId)
      .limit(1)
      .maybeSingle()

    if (linkedEntry) {
      return apiError(ApiErrorMessage.CANNOT_DELETE_PROFILE, StatusCodes.BAD_REQUEST)
    }

    try {
      const { data: deletedCount, error } = await client.rpc("delete_profiles_with_user", {
        p_profile_ids: [entityId],
        p_factory_id: factoryId!,
      })

      if (error) throw error

      if (!deletedCount || deletedCount === 0) {
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
