import { NextResponse } from "next/server";
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
} from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { getDynamicUserSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth/password";

export const GET = withAuth(async (req, user, client) => {
  const pagination = getPaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH);
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN) || EntityKey.CREATED_AT;
  const sortDesc = req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true";
  const roleParam = req.nextUrl.searchParams.get(EntityKey.ROLE);

  const factoryId = user.factory_id!;
  const factory = await getFactory(client, factoryId);
  const isAadharNotRequired = factory?.aadhar_number_mode === FieldRequirementMode.NOT_REQUIRED;

  let query = client
    .from(TableName.USERS)
    .select(
      `${EntityKey.ID}, ${EntityKey.USERNAME}, ${EntityKey.NAME}, ${EntityKey.AADHAR_NUMBER}, ${EntityKey.ROLE}, ${EntityKey.FACTORY_ID}, ${EntityKey.CREATED_AT}, ${EntityKey.UPDATED_AT}`,
      { count: "exact" },
    )
    .order(sortColumn, { ascending: !sortDesc })
    .eq(EntityKey.FACTORY_ID, factoryId)
    .is(EntityKey.DELETED_AT, null);

  if (roleParam && roleParam !== FilterValue.ALL) {
    query = query.eq(EntityKey.ROLE, roleParam);
  }

  if (search) {
    const searchNum = parseInt(search, 10);
    if (!isNaN(searchNum)) {
      if (!isAadharNotRequired) {
        query = query.or(
          `${EntityKey.NAME}.ilike.%${search}%,${EntityKey.AADHAR_NUMBER}.ilike.%${search}%,${EntityKey.USERNAME}.ilike.%${search}%,${EntityKey.ID}.eq.${searchNum}`,
        );
      } else {
        query = query.or(
          `${EntityKey.NAME}.ilike.%${search}%,${EntityKey.USERNAME}.ilike.%${search}%,${EntityKey.ID}.eq.${searchNum}`,
        );
      }
    } else {
      if (!isAadharNotRequired) {
        query = query.or(
          `${EntityKey.NAME}.ilike.%${search}%,${EntityKey.AADHAR_NUMBER}.ilike.%${search}%,${EntityKey.USERNAME}.ilike.%${search}%`,
        );
      } else {
        query = query.or(
          `${EntityKey.NAME}.ilike.%${search}%,${EntityKey.USERNAME}.ilike.%${search}%`,
        );
      }
    }
  }

  return fetchPaginatedResult(query, pagination);
});

export const POST = withAuth(async (req, user, client) => {
  const body = await req.json();
  const factoryId = user.factory_id!;
  const factory = await getFactory(client, factoryId);

  const dynamicSchema = getDynamicUserSchema(factory);
  const parsed = dynamicSchema.safeParse(body);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return apiError(firstIssue.message, StatusCodes.BAD_REQUEST);
  }

  const { name, aadhar_number, username, password, role } = parsed.data as {
    name: string;
    aadhar_number?: string | null;
    username: string;
    password: string;
    role: Role;
  };

  const { data: existingUser } = await client
    .from(TableName.USERS)
    .select(EntityKey.ID)
    .eq(EntityKey.USERNAME, username)
    .is(EntityKey.DELETED_AT, null)
    .maybeSingle();

  if (existingUser) return apiError(ApiErrorMessage.USERNAME_TAKEN, StatusCodes.BAD_REQUEST);

  if (aadhar_number) {
    const aadharQuery = client
      .from(TableName.USERS)
      .select(EntityKey.ID)
      .eq(EntityKey.AADHAR_NUMBER, aadhar_number)
      .eq(EntityKey.FACTORY_ID, factoryId)
      .is(EntityKey.DELETED_AT, null);

    const { data: existingAadhar } = await aadharQuery.maybeSingle();
    if (existingAadhar)
      return apiError(ApiErrorMessage.AADHAR_NUMBER_EXISTS, StatusCodes.BAD_REQUEST);
  }

  const passwordHash = await hashPassword(password);

  const { data: newUser, error } = await client
    .from(TableName.USERS)
    .insert({
      [EntityKey.USERNAME]: username,
      password_hash: passwordHash,
      [EntityKey.NAME]: name,
      [EntityKey.AADHAR_NUMBER]: aadhar_number || null,
      [EntityKey.ROLE]: role || Role.OPERATOR,
      [EntityKey.FACTORY_ID]: factoryId,
    })
    .select(
      `${EntityKey.ID}, ${EntityKey.USERNAME}, ${EntityKey.NAME}, ${EntityKey.AADHAR_NUMBER}, ${EntityKey.ROLE}, ${EntityKey.FACTORY_ID}, ${EntityKey.CREATED_AT}, ${EntityKey.UPDATED_AT}`,
    )
    .single();

  if (error || !newUser) {
    console.error("POST user error:", error);
    return apiError(
      error?.message || ApiErrorMessage.CREATE_USER_RECORD_FAILED,
      StatusCodes.BAD_REQUEST,
    );
  }

  return formatEntityResponse(newUser, StatusCodes.CREATED);
});

export const DELETE = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.USERS, PermissionKey.DELETE)) return forbiddenError();
  const ids = parseBulkIds(await req.json());
  if (!ids) return apiError(ApiErrorMessage.PROVIDE_VALID_IDS, StatusCodes.BAD_REQUEST);

  // Check if any active entries are linked to any of the selected users
  const { data: linkedEntries } = await client
    .from(TableName.ENTRIES)
    .select(EntityKey.ID)
    .in(EntityKey.USER_ID, ids)
    .is(EntityKey.DELETED_AT, null)
    .limit(1);

  if (linkedEntries && linkedEntries.length > 0) {
    return apiError(ApiErrorMessage.CANNOT_DELETE_SELECTED_USERS, StatusCodes.BAD_REQUEST);
  }

  // Check if any active customers are linked to any of the selected users
  const { data: linkedCustomers } = await client
    .from(TableName.CUSTOMERS)
    .select(EntityKey.ID)
    .in(EntityKey.USER_ID, ids)
    .is(EntityKey.DELETED_AT, null)
    .limit(1);

  if (linkedCustomers && linkedCustomers.length > 0) {
    return apiError(ApiErrorMessage.CANNOT_DELETE_SELECTED_USERS, StatusCodes.BAD_REQUEST);
  }

  const { data: deletedUsers, error } = await client
    .from(TableName.USERS)
    .update({
      [EntityKey.DELETED_AT]: new Date().toISOString(),
      [EntityKey.UPDATED_AT]: new Date().toISOString(),
    })
    .in(EntityKey.ID, ids)
    .is(EntityKey.DELETED_AT, null)
    .eq(EntityKey.FACTORY_ID, user.factory_id!)
    .select(EntityKey.ID);

  if (error) {
    return apiError(
      error.message || ApiErrorMessage.CANNOT_DELETE_SELECTED_USERS,
      StatusCodes.BAD_REQUEST,
    );
  }

  const deletedCount = deletedUsers?.length || 0;
  if (deletedCount !== ids.length) {
    return apiError(ApiErrorMessage.ONE_OR_MORE_USERS_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  return NextResponse.json({ success: true, deleted_count: deletedCount });
});
