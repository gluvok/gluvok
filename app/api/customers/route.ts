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
  EntityKey,
} from "@/lib/constants/enums"
import { ApiErrorMessage } from "@/lib/constants/messages"
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
    .eq(EntityKey.FACTORY_ID, user.factory_id!)

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
    const existingQuery = client
      .from(TableName.CUSTOMERS)
      .select("id")
      .eq("govt_id", Number(govt_id))
      .eq(EntityKey.FACTORY_ID, targetFactoryId!)

    const { data: existingCustomer } = await existingQuery.maybeSingle()
    if (existingCustomer) {
      return apiError(
        "Govt ID already exists in this factory",
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
      return apiError(ApiErrorMessage.USERNAME_TAKEN, StatusCodes.BAD_REQUEST)
    }

    const passwordHash = await hashPassword(password)
    const { data: newUser, error: userErr } = await client
      .from(TableName.USERS)
      .insert({
        username,
        password_hash: passwordHash,
        role: Role.BASE,
        [EntityKey.FACTORY_ID]: targetFactoryId,
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
    [EntityKey.FACTORY_ID]: targetFactoryId,
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
      ApiErrorMessage.PROVIDE_VALID_IDS,
      StatusCodes.BAD_REQUEST
    )

  try {
    const query = client.from(TableName.CUSTOMERS).delete().in("id", ids).eq(EntityKey.FACTORY_ID, user.factory_id!)

    const { data, error } = await query.select("id")
    if (error) throw error

    if (!data || data.length !== ids.length) {
      return apiError(ApiErrorMessage.ONE_OR_MORE_CUSTOMERS_NOT_FOUND, StatusCodes.NOT_FOUND)
    }

    return NextResponse.json({ success: true, deleted_count: data.length })
  } catch (error) {
    if (isFKViolation(error)) {
      return apiError(
        ApiErrorMessage.CANNOT_DELETE_SELECTED_CUSTOMERS,
        StatusCodes.BAD_REQUEST
      )
    }
    throw error
  }
})
