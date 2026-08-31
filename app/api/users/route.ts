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
import { Role, ProjectSlug, PermissionKey, FieldRequirementMode } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { getDynamicUserSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth/password";
import { clearAuthCookies } from "@/lib/auth/cookies";

export const GET = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.USERS, PermissionKey.READ)) return forbiddenError();
  const pagination = getPaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get("search");
  const sortColumn = req.nextUrl.searchParams.get("sort_column") || "created_at";
  const sortDesc = req.nextUrl.searchParams.has("sort_desc")
    ? req.nextUrl.searchParams.get("sort_desc") === "true"
    : true;
  const roleParam = req.nextUrl.searchParams.get("role");

  const factoryId = user.factory_id;
  const factory = await getFactory(client, factoryId);
  const isAadharNotRequired = factory?.aadhar_number_mode === FieldRequirementMode.NOT_REQUIRED;

  let query = client
    .from("users")
    .select("id, username, name, aadhar_number, role, factory_id, created_at, updated_at", {
      count: "exact",
    })
    .order(sortColumn, { ascending: !sortDesc })
    .eq("factory_id", factoryId)
    .is("deleted_at", null);

  if (roleParam && roleParam !== "all") {
    query = query.eq("role", roleParam);
  }

  if (search) {
    const searchNum = parseInt(search, 10);
    if (!isNaN(searchNum)) {
      if (!isAadharNotRequired) {
        query = query.or(
          `name.ilike.%${search}%,aadhar_number.ilike.%${search}%,username.ilike.%${search}%,id.eq.${searchNum}`,
        );
      } else {
        query = query.or(`name.ilike.%${search}%,username.ilike.%${search}%,id.eq.${searchNum}`);
      }
    } else {
      if (!isAadharNotRequired) {
        query = query.or(
          `name.ilike.%${search}%,aadhar_number.ilike.%${search}%,username.ilike.%${search}%`,
        );
      } else {
        query = query.or(`name.ilike.%${search}%,username.ilike.%${search}%`);
      }
    }
  }

  return fetchPaginatedResult(query, pagination);
});

export const POST = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.USERS, PermissionKey.CREATE)) return forbiddenError();
  const body = await req.json();
  const factoryId = user.factory_id;
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
    .from("users")
    .select("id")
    .eq("username", username)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingUser) return apiError(ApiErrorMessage.USERNAME_TAKEN, StatusCodes.BAD_REQUEST);

  if (aadhar_number) {
    const aadharQuery = client
      .from("users")
      .select("id")
      .eq("aadhar_number", aadhar_number)
      .eq("factory_id", factoryId)
      .is("deleted_at", null);

    const { data: existingAadhar } = await aadharQuery.maybeSingle();
    if (existingAadhar)
      return apiError(ApiErrorMessage.AADHAR_NUMBER_EXISTS, StatusCodes.BAD_REQUEST);
  }

  const passwordHash = await hashPassword(password);

  const { data: newUser, error } = await client
    .from("users")
    .insert({
      username,
      password_hash: passwordHash,
      name,
      aadhar_number: aadhar_number || null,
      role: role || Role.OPERATOR,
      factory_id: factoryId,
    })
    .select("id, username, name, aadhar_number, role, factory_id, created_at, updated_at")
    .single();

  if (error || !newUser) {
    console.error("POST user error:", error);
    return apiError(
      error?.message || ApiErrorMessage.CREATE_USER_RECORD_FAILED,
      StatusCodes.BAD_REQUEST,
    );
  }

  return formatEntityResponse(newUser, StatusCodes.CREATED, { factory });
});

export const DELETE = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.USERS, PermissionKey.DELETE)) return forbiddenError();
  const ids = parseBulkIds(await req.json());
  if (!ids) return apiError(ApiErrorMessage.PROVIDE_VALID_IDS, StatusCodes.BAD_REQUEST);

  // Check if any active entries are linked to any of the selected users
  const { data: linkedEntries } = await client
    .from("entries")
    .select("id")
    .in("user_id", ids)
    .is("deleted_at", null)
    .limit(1);

  if (linkedEntries && linkedEntries.length > 0) {
    return apiError(ApiErrorMessage.CANNOT_DELETE_SELECTED_USERS, StatusCodes.BAD_REQUEST);
  }

  // Check if any active customers are linked to any of the selected users
  const { data: linkedCustomers } = await client
    .from("customers")
    .select("id")
    .in("user_id", ids)
    .is("deleted_at", null)
    .limit(1);

  if (linkedCustomers && linkedCustomers.length > 0) {
    return apiError(ApiErrorMessage.CANNOT_DELETE_SELECTED_USERS, StatusCodes.BAD_REQUEST);
  }

  const { data: deletedUsers, error } = await client
    .from("users")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in("id", ids)
    .is("deleted_at", null)
    .eq("factory_id", user.factory_id)
    .select("id");

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

  const isSelfDeleted = ids.includes(Number(user.sub));
  const response = NextResponse.json({
    success: true,
    deleted_count: deletedCount,
    is_self_deleted: isSelfDeleted,
  });

  if (isSelfDeleted) {
    clearAuthCookies(response);
  }

  return response;
});
