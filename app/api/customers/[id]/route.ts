import { NextResponse } from "next/server"
import {
  withAuth,
  withEntityScope,
  apiError,
  isFKViolation,
  forbiddenError,
  hasPermission,
  StatusCodes,
  getFactoryConfig,
  formatEntityResponse,
} from "@/db/helpers"
import {
  ProjectSlug,
  PermissionKey,
  Role,
  TableName,
} from "@/lib/constants/enums"
import { getDynamicCustomerSchema } from "@/lib/validation"
import { hashPassword } from "@/lib/auth/password"

export const GET = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.CUSTOMERS, PermissionKey.READ))
      return forbiddenError()

    let query = client
      .from(TableName.CUSTOMERS)
      .select("*, users!left(username, is_active)")
      .eq("id", entityId)

    if (factoryId) {
      query = query.eq("factory_id", factoryId)
    }

    const { data: customer, error } = await query.maybeSingle()
    if (error || !customer) return apiError("Customer not found", StatusCodes.NOT_FOUND)

    return formatEntityResponse(customer)
  })
)

export const PATCH = withAuth(
  withEntityScope(async (req, user, client, _ctx, { entityId, factoryId }) => {
    let existingQuery = client
      .from(TableName.CUSTOMERS)
      .select("id, user_id, name")
      .eq("id", entityId)

    if (factoryId) {
      existingQuery = existingQuery.eq("factory_id", factoryId)
    }

    const { data: existing } = await existingQuery.maybeSingle()

    const isOwn =
      existing?.user_id != null &&
      String(existing.user_id) === String(user.sub)

    if (!isOwn && !hasPermission(user, ProjectSlug.CUSTOMERS, PermissionKey.WRITE)) {
      return forbiddenError()
    }

    const body = await req.json()
    const activeConfig = await getFactoryConfig(user.factory_id)
    const dynamicSchema = getDynamicCustomerSchema(activeConfig, true)
    const parsed = dynamicSchema.safeParse(body)

    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST)
    }

    const { name, father_name, username, password, is_active } = body

    if (username && typeof username === "string" && username.trim().length > 0) {
      const cleanUsername = username.trim()
      let userQuery = client.from(TableName.USERS).select("id").eq("username", cleanUsername)
      if (existing?.user_id != null) {
        userQuery = userQuery.neq("id", existing.user_id)
      }
      const { data: takenUser } = await userQuery.maybeSingle()
      if (takenUser) {
        return apiError("Username is already taken", StatusCodes.BAD_REQUEST)
      }
    }

    let updateQuery = client
      .from(TableName.CUSTOMERS)
      .update({
        ...(name ? { name } : {}),
        ...(father_name ? { father_name } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", entityId)

    if (factoryId) {
      updateQuery = updateQuery.eq("factory_id", factoryId)
    }

    const { data: updated, error } = await updateQuery.select().maybeSingle()

    if (error || !updated) {
      return apiError("Customer not found", StatusCodes.NOT_FOUND)
    }

    if (updated.user_id) {
      const userUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (username && typeof username === "string" && username.trim().length > 0) {
        userUpdates.username = username.trim()
      }
      if (password && typeof password === "string" && password.trim().length > 0) {
        userUpdates.password_hash = await hashPassword(password.trim())
      }
      if (is_active !== undefined) {
        userUpdates.is_active = Boolean(is_active)
      }
      if (Object.keys(userUpdates).length > 1) {
        await client.from(TableName.USERS).update(userUpdates).eq("id", updated.user_id)
      }
    } else if (
      username &&
      typeof username === "string" &&
      username.trim().length > 0 &&
      password &&
      typeof password === "string" &&
      password.trim().length > 0
    ) {
      const passwordHash = await hashPassword(password.trim())
      const { data: newUser } = await client
        .from(TableName.USERS)
        .insert({
          username: username.trim(),
          password_hash: passwordHash,
          role: Role.BASE,
          factory_id: factoryId,
        })
        .select()
        .single()

      if (newUser) {
        await client
          .from(TableName.CUSTOMERS)
          .update({ user_id: newUser.id })
          .eq("id", updated.id)

        updated.user_id = newUser.id
      }
    }

    return formatEntityResponse(updated)
  })
)

export const PUT = PATCH

export const DELETE = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.CUSTOMERS, PermissionKey.DELETE))
      return forbiddenError()

    try {
      let query = client.from(TableName.CUSTOMERS).delete().eq("id", entityId)
      if (factoryId) {
        query = query.eq("factory_id", factoryId)
      }

      const { data, error } = await query.select("id")
      if (error) {
        if (isFKViolation(error)) {
          return apiError(
            "Cannot delete this customer because they are referenced by existing weighments.",
            StatusCodes.BAD_REQUEST
          )
        }
        throw error
      }

      if (!data || data.length === 0) {
        return apiError("Customer not found", StatusCodes.NOT_FOUND)
      }

      return NextResponse.json({ success: true, id: entityId })
    } catch (error) {
      if (isFKViolation(error)) {
        return apiError(
          "Cannot delete this customer because they are referenced by existing weighments.",
          StatusCodes.BAD_REQUEST
        )
      }
      throw error
    }
  })
)
