import { NextResponse } from "next/server"
import {
  withAuth,
  withEntityScope,
  apiError,
  isFKViolation,
  forbiddenError,
  hasPermission,
  StatusCodes,
  getFactory,
  formatEntityResponse,
} from "@/db/helpers";
import {
  ProjectSlug,
  PermissionKey,
  TableName,
  EntityKey,
} from "@/lib/constants/enums"
import { ApiErrorMessage } from "@/lib/constants/messages"
import { getDynamicCustomerSchema } from "@/lib/validation"
import { hashPassword } from "@/lib/auth/password"

export const PATCH = withAuth(
  withEntityScope(async (req, user, client, _ctx, { entityId, factoryId }) => {
    const existingQuery = client
      .from(TableName.CUSTOMERS)
      .select(`${EntityKey.ID}, ${EntityKey.USER_ID}, ${EntityKey.NAME}`)
      .eq(EntityKey.ID, entityId)
      .eq(EntityKey.FACTORY_ID, factoryId!)

    const { data: existing } = await existingQuery.maybeSingle()
    if (!existing) return apiError(ApiErrorMessage.CUSTOMER_NOT_FOUND, StatusCodes.NOT_FOUND)

    const isOwn =
      existing?.user_id != null &&
      String(existing.user_id) === String(user.sub)

    if (!isOwn && !hasPermission(user, ProjectSlug.CUSTOMERS, PermissionKey.WRITE)) {
      return forbiddenError()
    }

    const body = await req.json()
    const factory = await getFactory(client, user.factory_id);
    const dynamicSchema = getDynamicCustomerSchema(factory, true);
    const parsed = dynamicSchema.safeParse(body)

    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST)
    }

    const { name, father_name, govt_id, username, password, is_active } = body

    if (username && typeof username === "string" && username.trim().length > 0) {
      const cleanUsername = username.trim()
      let userQuery = client.from(TableName.USERS).select(EntityKey.ID).eq(EntityKey.USERNAME, cleanUsername)
      if (existing?.user_id != null) {
        userQuery = userQuery.neq(EntityKey.ID, existing.user_id)
      }
      const { data: takenUser } = await userQuery.maybeSingle()
      if (takenUser) {
        return apiError(ApiErrorMessage.USERNAME_TAKEN, StatusCodes.BAD_REQUEST)
      }
    }

    let passwordHash: string | null = null
    if (password && typeof password === "string" && password.trim().length > 0) {
      passwordHash = await hashPassword(password.trim())
    }

    const { data: updated, error } = await client.rpc("update_customer_with_user", {
      p_customer_id: entityId,
      p_factory_id: factoryId!,
      p_name: name ? String(name).trim() : null,
      p_father_name: father_name ? String(father_name).trim() : null,
      p_govt_id: govt_id != null ? Number(govt_id) : null,
      p_username: username && typeof username === "string" ? username.trim() : null,
      p_password_hash: passwordHash,
      p_is_active: is_active !== undefined ? Boolean(is_active) : null,
    })

    if (error || !updated) {
      return apiError(error?.message || ApiErrorMessage.CUSTOMER_NOT_FOUND, StatusCodes.NOT_FOUND)
    }

    return formatEntityResponse(updated)
  })
)

export const DELETE = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.CUSTOMERS, PermissionKey.DELETE))
      return forbiddenError()

    try {
      const { data: deletedCount, error } = await client.rpc("delete_customers_with_user", {
        p_customer_ids: [entityId],
        p_factory_id: factoryId!,
      })

      if (error) throw error

      if (!deletedCount || deletedCount === 0) {
        return apiError(ApiErrorMessage.CUSTOMER_NOT_FOUND, StatusCodes.NOT_FOUND)
      }

      return NextResponse.json({ success: true, id: entityId })
    } catch (error) {
      if (isFKViolation(error)) {
        return apiError(
          ApiErrorMessage.CANNOT_DELETE_CUSTOMER,
          StatusCodes.BAD_REQUEST
        )
      }
      throw error
    }
  })
)
