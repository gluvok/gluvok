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
  isFKViolation,
  parseBulkIds,
} from "@/db/helpers";
import {
  ProjectSlug,
  PermissionKey,
  QueryParam,
  FieldRequirementMode,
  TableName,
  EntityKey,
} from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { hashPassword } from "@/lib/auth/password";
import { getDynamicCustomerSchema } from "@/lib/validation";

export const GET = withAuth(async (req, user, client) => {
  const pagination = getPaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH);
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN) || EntityKey.CREATED_AT;
  const sortDesc = req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true";

  const factory = await getFactory(client, user.factory_id);
  const isGovtIdNotRequired = factory?.govt_id_mode === FieldRequirementMode.NOT_REQUIRED;

  let query = client
    .from(TableName.CUSTOMERS)
    .select(`*, ${TableName.USERS}!left(${EntityKey.USERNAME}, ${EntityKey.IS_ACTIVE})`, {
      count: "exact",
    })
    .order(sortColumn, { ascending: !sortDesc })
    .eq(EntityKey.FACTORY_ID, user.factory_id!);

  if (search) {
    const searchNum = parseInt(search, 10);
    if (!isNaN(searchNum)) {
      if (!isGovtIdNotRequired) {
        query = query.or(
          `${EntityKey.NAME}.ilike.%${search}%,${EntityKey.FATHER_NAME}.ilike.%${search}%,${EntityKey.ID}.eq.${searchNum},${EntityKey.GOVT_ID}.eq.${searchNum}`,
        );
      } else {
        query = query.or(
          `${EntityKey.NAME}.ilike.%${search}%,${EntityKey.FATHER_NAME}.ilike.%${search}%,${EntityKey.ID}.eq.${searchNum}`,
        );
      }
    } else {
      query = query.or(
        `${EntityKey.NAME}.ilike.%${search}%,${EntityKey.FATHER_NAME}.ilike.%${search}%`,
      );
    }
  }

  return fetchPaginatedResult(query, pagination);
});

export const POST = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.CUSTOMERS, PermissionKey.CREATE)) return forbiddenError();
  const body = await req.json();

  const factoryId = user.factory_id!;
  const factory = await getFactory(client, factoryId);

  const dynamicSchema = getDynamicCustomerSchema(factory);
  const parsed = dynamicSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST);
  }

  const { govt_id, name, father_name, username, password } = parsed.data as {
    govt_id?: number | null;
    name: string;
    father_name: string;
    username?: string;
    password?: string;
  };

  if (govt_id != null) {
    const existingQuery = client
      .from(TableName.CUSTOMERS)
      .select(EntityKey.ID)
      .eq(EntityKey.GOVT_ID, Number(govt_id))
      .eq(EntityKey.FACTORY_ID, factoryId);

    const { data: existingCustomer } = await existingQuery.maybeSingle();
    if (existingCustomer) {
      return apiError(ApiErrorMessage.GOVT_ID_EXISTS, StatusCodes.BAD_REQUEST);
    }
  }

  let passwordHash: string | null = null;
  if (username && password) {
    const { data: existingUser } = await client
      .from(TableName.USERS)
      .select(EntityKey.ID)
      .eq(EntityKey.USERNAME, username)
      .maybeSingle();

    if (existingUser) {
      return apiError(ApiErrorMessage.USERNAME_TAKEN, StatusCodes.BAD_REQUEST);
    }

    passwordHash = await hashPassword(password);
  }

  const { data: newCustomer, error } = await client.rpc("create_customer_with_user", {
    p_factory_id: factoryId,
    p_name: name,
    p_father_name: father_name,
    p_govt_id: govt_id != null ? Number(govt_id) : null,
    p_username: username || null,
    p_password_hash: passwordHash || null,
  });

  if (error || !newCustomer) {
    console.error("POST customer RPC error:", error);
    return apiError(
      error?.message || ApiErrorMessage.CREATE_CUSTOMER_FAILED,
      StatusCodes.BAD_REQUEST,
    );
  }

  return formatEntityResponse(newCustomer, StatusCodes.CREATED);
});

export const DELETE = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.CUSTOMERS, PermissionKey.DELETE)) return forbiddenError();
  const ids = parseBulkIds(await req.json());
  if (!ids) return apiError(ApiErrorMessage.PROVIDE_VALID_IDS, StatusCodes.BAD_REQUEST);

  // Check if any entries are linked to any of the selected customers
  const { data: linkedEntries } = await client
    .from(TableName.ENTRIES)
    .select(EntityKey.ID)
    .in(EntityKey.CUSTOMER_ID, ids)
    .limit(1);

  if (linkedEntries && linkedEntries.length > 0) {
    return apiError(ApiErrorMessage.CANNOT_DELETE_SELECTED_CUSTOMERS, StatusCodes.BAD_REQUEST);
  }

  try {
    const { data: deletedCount, error } = await client.rpc("delete_customers_with_user", {
      p_customer_ids: ids,
      p_factory_id: user.factory_id!,
    });

    if (error) throw error;

    if (deletedCount !== ids.length) {
      return apiError(ApiErrorMessage.ONE_OR_MORE_CUSTOMERS_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    return NextResponse.json({ success: true, deleted_count: deletedCount });
  } catch (error) {
    if (isFKViolation(error)) {
      return apiError(ApiErrorMessage.CANNOT_DELETE_SELECTED_CUSTOMERS, StatusCodes.BAD_REQUEST);
    }
    throw error;
  }
});
