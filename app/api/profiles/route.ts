import { NextResponse } from "next/server"
import {
  withAuth,
  getPaginationParams,
  apiError,
  forbiddenError,
  hasPermission,
  StatusCodes,
  getFactory,
  fetchPaginatedResult,
  formatEntityResponse,
  isFKViolation,
  parseBulkIds,
} from "@/db/helpers";
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
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN) || EntityKey.CREATED_AT
  const sortDesc = req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true"
  const roleParam = req.nextUrl.searchParams.get(EntityKey.ROLE)

  const factoryId = user.factory_id!
  const factory = await getFactory(client, factoryId);
  const isAadharNotRequired =
    factory?.aadhar_number_mode === FieldRequirementMode.NOT_REQUIRED;

  let query = client
    .from(TableName.PROFILES)
    .select(`*, ${TableName.USERS}!inner(${EntityKey.USERNAME}, ${EntityKey.IS_ACTIVE}, ${EntityKey.FACTORY_ID})`, { count: "exact" })
    .order(sortColumn, { ascending: !sortDesc })
    .eq(`${TableName.USERS}.${EntityKey.FACTORY_ID}`, factoryId)

  if (roleParam && roleParam !== FilterValue.ALL) {
    query = query.eq(EntityKey.ROLE, roleParam)
  }

  if (search) {
    const searchNum = parseInt(search, 10)
    if (!isNaN(searchNum)) {
      if (!isAadharNotRequired) {
        query = query.or(`${EntityKey.NAME}.ilike.%${search}%,${EntityKey.AADHAR_NUMBER}.ilike.%${search}%,${EntityKey.ID}.eq.${searchNum}`)
      } else {
        query = query.or(`${EntityKey.NAME}.ilike.%${search}%,${EntityKey.ID}.eq.${searchNum}`)
      }
    } else {
      if (!isAadharNotRequired) {
        query = query.or(`${EntityKey.NAME}.ilike.%${search}%,${EntityKey.AADHAR_NUMBER}.ilike.%${search}%`)
      } else {
        query = query.ilike(EntityKey.NAME, `%${search}%`)
      }
    }
  }

  return fetchPaginatedResult(query, pagination)
})

export const POST = withAuth(async (req, user, client) => {
  const body = await req.json()
  const factoryId = user.factory_id!
  const factory = await getFactory(client, factoryId);

  const dynamicSchema = getDynamicProfileSchema(factory);
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
    .select(EntityKey.ID)
    .eq(EntityKey.USERNAME, username)
    .maybeSingle()

  if (existingUser)
    return apiError(ApiErrorMessage.USERNAME_TAKEN, StatusCodes.BAD_REQUEST)

  if (aadhar_number) {
    const aadharQuery = client
      .from(TableName.PROFILES)
      .select(`${EntityKey.ID}, ${TableName.USERS}!inner(${EntityKey.FACTORY_ID})`)
      .eq(EntityKey.AADHAR_NUMBER, aadhar_number)
      .eq(`${TableName.USERS}.${EntityKey.FACTORY_ID}`, factoryId)

    const { data: existingProfile } = await aadharQuery.maybeSingle()
    if (existingProfile)
      return apiError(
        ApiErrorMessage.AADHAR_NUMBER_EXISTS,
        StatusCodes.BAD_REQUEST
      )
  }

  const passwordHash = await hashPassword(password)

  const { data: newProfile, error } = await client.rpc("create_profile_with_user", {
    p_factory_id: factoryId,
    p_name: name,
    p_username: username,
    p_password_hash: passwordHash,
    p_role: role || Role.OPERATOR,
    p_aadhar_number: aadhar_number || null,
  })

  if (error || !newProfile) {
    console.error("POST profile RPC error:", error)
    return apiError(error?.message || ApiErrorMessage.CREATE_PROFILE_RECORD_FAILED, StatusCodes.BAD_REQUEST)
  }

  return formatEntityResponse(newProfile, StatusCodes.CREATED)
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

  // Check if any entries are linked to any of the selected profiles
  const { data: linkedEntries } = await client
    .from(TableName.ENTRIES)
    .select(EntityKey.ID)
    .in(EntityKey.PROFILE_ID, ids)
    .limit(1)

  if (linkedEntries && linkedEntries.length > 0) {
    return apiError(ApiErrorMessage.CANNOT_DELETE_SELECTED_PROFILES, StatusCodes.BAD_REQUEST)
  }

  try {
    const { data: deletedCount, error } = await client.rpc("delete_profiles_with_user", {
      p_profile_ids: ids,
      p_factory_id: user.factory_id!,
    })

    if (error) throw error

    if (deletedCount !== ids.length) {
      return apiError(ApiErrorMessage.ONE_OR_MORE_PROFILES_NOT_FOUND, StatusCodes.NOT_FOUND)
    }

    return NextResponse.json({ success: true, deleted_count: deletedCount })
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
