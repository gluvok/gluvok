import { NextResponse } from "next/server"
import {
  withAuth,
  getPaginationParams,
  apiError,
  forbiddenError,
  hasPermission,
  StatusCodes,
  getFactoryConfig,
  fetchPaginatedResult,
  formatEntityResponse,
  isFKViolation,
  parseBulkIds,
} from "@/db/helpers"
import {
  Role,
  ProjectSlug,
  PermissionKey,
  QueryParam,
  FieldRequirementMode,
  TableName,
} from "@/lib/constants/enums"
import { hashPassword } from "@/lib/auth/password"
import { getDynamicCustomerSchema } from "@/lib/validation"

export const GET = withAuth(async (req, user, client) => {
  const pagination = getPaginationParams(req.nextUrl)
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH)
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN) || "created_at"
  const sortDesc = req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true"

  const activeConfig = await getFactoryConfig(user.factory_id)
  const isGovtIdNotRequired =
    activeConfig?.govtIdMode === FieldRequirementMode.NOT_REQUIRED

  let query = client
    .from(TableName.CUSTOMERS)
    .select("*, users!left(username, is_active)", { count: "exact" })
    .order(sortColumn, { ascending: !sortDesc })

  if (user.factory_id) {
    query = query.eq("factory_id", user.factory_id)
  }

  if (search) {
    const searchNum = parseInt(search, 10)
    if (!isNaN(searchNum)) {
      if (!isGovtIdNotRequired) {
        query = query.or(`name.ilike.%${search}%,father_name.ilike.%${search}%,id.eq.${searchNum},govt_id.eq.${searchNum}`)
      } else {
        query = query.or(`name.ilike.%${search}%,father_name.ilike.%${search}%,id.eq.${searchNum}`)
      }
    } else {
      query = query.or(`name.ilike.%${search}%,father_name.ilike.%${search}%`)
    }
  }

  return fetchPaginatedResult(query, pagination)
})

export const POST = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.CUSTOMERS, PermissionKey.CREATE))
    return forbiddenError()
  const body = await req.json()

  const targetFactoryId = user.factory_id ?? null
  const activeConfig = await getFactoryConfig(targetFactoryId)

  const dynamicSchema = getDynamicCustomerSchema(activeConfig)
  const parsed = dynamicSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST)
  }

  const { govt_id, name, father_name, username, password } = parsed.data as {
    govt_id?: number | null
    name: string
    father_name: string
    username?: string
    password?: string
  }

  if (govt_id != null) {
    let existingQuery = client.from(TableName.CUSTOMERS).select("id").eq("govt_id", Number(govt_id))
    if (targetFactoryId) {
      existingQuery = existingQuery.eq("factory_id", targetFactoryId)
    }
    const { data: existingCustomer } = await existingQuery.maybeSingle()
    if (existingCustomer) {
      return apiError(
        targetFactoryId
          ? "Govt ID already exists in this factory"
          : "Govt ID already exists",
        StatusCodes.BAD_REQUEST
      )
    }
  }

  let createdUserId: number | null = null
  if (username && password) {
    const { data: existingUser } = await client
      .from(TableName.USERS)
      .select("id")
      .eq("username", username)
      .maybeSingle()

    if (existingUser) {
      return apiError("Username is already taken", StatusCodes.BAD_REQUEST)
    }

    const passwordHash = await hashPassword(password)
    const { data: newUser, error: userErr } = await client
      .from(TableName.USERS)
      .insert({
        username,
        password_hash: passwordHash,
        role: Role.BASE,
        factory_id: targetFactoryId,
      })
      .select()
      .single()

    if (userErr || !newUser) {
      console.error("Failed to create user for customer:", userErr)
      return apiError("Failed to create customer user account", StatusCodes.BAD_REQUEST)
    }
    createdUserId = newUser.id
  }

  const customerValues = {
    ...(govt_id != null ? { govt_id: Number(govt_id) } : {}),
    name,
    father_name,
    user_id: createdUserId,
    factory_id: targetFactoryId,
  }

  const { data: newCustomer, error } = await client
    .from(TableName.CUSTOMERS)
    .insert(customerValues)
    .select()
    .single()

  if (error) {
    console.error("POST customer error:", error)
    return apiError(error.message || "Failed to create customer", StatusCodes.BAD_REQUEST)
  }

  return formatEntityResponse(newCustomer, StatusCodes.CREATED)
})

export const DELETE = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.CUSTOMERS, PermissionKey.DELETE))
    return forbiddenError()
  const ids = parseBulkIds(await req.json())
  if (!ids)
    return apiError(
      "Provide between 1 and 100 valid IDs",
      StatusCodes.BAD_REQUEST
    )

  try {
    let query = client.from(TableName.CUSTOMERS).delete().in("id", ids)
    if (user.factory_id) {
      query = query.eq("factory_id", user.factory_id)
    }

    const { data, error } = await query.select("id")
    if (error) {
      if (isFKViolation(error)) {
        return apiError(
          "Cannot delete selected customers because they are referenced by existing weighments.",
          StatusCodes.BAD_REQUEST
        )
      }
      throw error
    }

    if (!data || data.length !== ids.length) {
      return apiError("One or more customers were not found", StatusCodes.NOT_FOUND)
    }

    return NextResponse.json({ success: true, deleted_count: data.length })
  } catch (error) {
    if (isFKViolation(error)) {
      return apiError(
        "Cannot delete selected customers because they are referenced by existing weighments.",
        StatusCodes.BAD_REQUEST
      )
    }
    throw error
  }
})
