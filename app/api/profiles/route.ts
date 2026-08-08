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
  EntityKey,
  FilterValue,
  FieldRequirementMode,
  TableName,
} from "@/lib/constants/enums"
import { ApiErrorMessage } from "@/lib/constants/messages"
import { getDynamicProfileSchema } from "@/lib/validation"
import { hashPassword } from "@/lib/auth/password"

export const GET = withAuth(async (req, user, client) => {
  const pagination = getPaginationParams(req.nextUrl)
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH)
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN) || "created_at"
  const sortDesc = req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true"
  const roleParam = req.nextUrl.searchParams.get(EntityKey.ROLE)

  const activeConfig = await getFactoryConfig(user.factory_id)
  const isAadharNotRequired =
    activeConfig?.aadharNumberMode === FieldRequirementMode.NOT_REQUIRED

  let query = client
    .from(TableName.PROFILES)
    .select("*, users!inner(username, is_active, factory_id)", { count: "exact" })
    .order(sortColumn, { ascending: !sortDesc })
    .eq(`users.${EntityKey.FACTORY_ID}`, user.factory_id!)

  if (roleParam && roleParam !== FilterValue.ALL) {
    query = query.eq("role", roleParam)
  }

  if (search) {
    const searchNum = parseInt(search, 10)
    if (!isNaN(searchNum)) {
      if (!isAadharNotRequired) {
        query = query.or(`name.ilike.%${search}%,aadhar_number.ilike.%${search}%,id.eq.${searchNum}`)
      } else {
        query = query.or(`name.ilike.%${search}%,id.eq.${searchNum}`)
      }
    } else {
      if (!isAadharNotRequired) {
        query = query.or(`name.ilike.%${search}%,aadhar_number.ilike.%${search}%`)
      } else {
        query = query.ilike("name", `%${search}%`)
      }
    }
  }

  return fetchPaginatedResult(query, pagination)
})

export const POST = withAuth(async (req, user, client) => {
  const body = await req.json()
  const targetFactoryId = user.factory_id ?? null
  const activeConfig = await getFactoryConfig(targetFactoryId)

  const dynamicSchema = getDynamicProfileSchema(activeConfig)
  const parsed = dynamicSchema.safeParse(body)

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return apiError(firstIssue.message, StatusCodes.BAD_REQUEST)
  }

  const { name, aadhar_number, username, password, role } = parsed.data as {
    name: string
    aadhar_number?: string | null
    username: string
    password: string
    role: Role
  }

  const { data: existingUser } = await client
    .from(TableName.USERS)
    .select("id")
    .eq("username", username)
    .maybeSingle()

  if (existingUser)
    return apiError(ApiErrorMessage.USERNAME_TAKEN, StatusCodes.BAD_REQUEST)

  if (aadhar_number) {
    const aadharQuery = client
      .from(TableName.PROFILES)
      .select("id, users!inner(factory_id)")
      .eq("aadhar_number", aadhar_number)
      .eq(`users.${EntityKey.FACTORY_ID}`, targetFactoryId!)

    const { data: existingProfile } = await aadharQuery.maybeSingle()
    if (existingProfile)
      return apiError(
        "Aadhar number is already registered in this factory",
        StatusCodes.BAD_REQUEST
      )
  }

  const passwordHash = await hashPassword(password)
  const { data: newUser, error: userErr } = await client
    .from(TableName.USERS)
    .insert({
      username,
      password_hash: passwordHash,
      role,
      [EntityKey.FACTORY_ID]: targetFactoryId,
    })
    .select()
    .single()

  if (userErr || !newUser) {
    console.error("Failed to create user for profile:", userErr)
    return apiError("Failed to create user account for profile", StatusCodes.BAD_REQUEST)
  }

  const { data: newProfile, error: profileErr } = await client
    .from(TableName.PROFILES)
    .insert({
      user_id: newUser.id,
      name,
      ...(aadhar_number ? { aadhar_number } : {}),
      role,
      [EntityKey.FACTORY_ID]: targetFactoryId,
    })
    .select()
    .single()

  if (profileErr || !newProfile) {
    console.error("Failed to create profile:", profileErr)
    return apiError("Failed to create profile record", StatusCodes.BAD_REQUEST)
  }

  return formatEntityResponse(
    {
      ...newProfile,
      username: newUser.username,
      is_active: newUser.is_active,
      [EntityKey.FACTORY_ID]: targetFactoryId,
    },
    StatusCodes.CREATED
  )
})

export const DELETE = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.PROFILES, PermissionKey.DELETE))
    return forbiddenError()
  const ids = parseBulkIds(await req.json())
  if (!ids)
    return apiError(
      ApiErrorMessage.PROVIDE_VALID_IDS,
      StatusCodes.BAD_REQUEST
    )

  try {
    const query = client.from(TableName.PROFILES).delete().in("id", ids).eq(EntityKey.FACTORY_ID, user.factory_id!)

    const { data, error } = await query.select("id")
    if (error) throw error

    if (!data || data.length !== ids.length) {
      return apiError(ApiErrorMessage.ONE_OR_MORE_PROFILES_NOT_FOUND, StatusCodes.NOT_FOUND)
    }

    return NextResponse.json({ success: true, deleted_count: data.length })
  } catch (error) {
    if (isFKViolation(error)) {
      return apiError(
        ApiErrorMessage.CANNOT_DELETE_SELECTED_PROFILES,
        StatusCodes.BAD_REQUEST
      )
    }
    throw error
  }
})
