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
import { ProjectSlug, PermissionKey, FieldRequirementMode } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { hashPassword } from "@/lib/auth/password";
import { getDynamicCustomerSchema } from "@/lib/validation";

export const GET = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.CUSTOMERS, PermissionKey.READ)) return forbiddenError();
  const pagination = getPaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get("search");
  const sortColumn = req.nextUrl.searchParams.get("sort_column") || "created_at";
  const sortDesc = req.nextUrl.searchParams.has("sort_desc")
    ? req.nextUrl.searchParams.get("sort_desc") === "true"
    : true;

  const factory = await getFactory(client, user.factory_id);
  const isGovtIdNotRequired = factory?.govt_id_mode === FieldRequirementMode.NOT_REQUIRED;

  let query = client
    .from("customers")
    .select(`*, users!left(username)`, {
      count: "exact",
    })
    .order(sortColumn, { ascending: !sortDesc })
    .eq("factory_id", user.factory_id!)
    .is("deleted_at", null);

  if (search) {
    const searchNum = parseInt(search, 10);
    if (!isNaN(searchNum)) {
      if (!isGovtIdNotRequired) {
        query = query.or(
          `name.ilike.%${search}%,father_name.ilike.%${search}%,id.eq.${searchNum},govt_id.eq.${searchNum}`,
        );
      } else {
        query = query.or(`name.ilike.%${search}%,father_name.ilike.%${search}%,id.eq.${searchNum}`);
      }
    } else {
      query = query.or(`name.ilike.%${search}%,father_name.ilike.%${search}%`);
    }
  }

  return fetchPaginatedResult(query, pagination);
});

export const POST = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.CUSTOMERS, PermissionKey.CREATE)) return forbiddenError();
  const body = await req.json();

  const factoryId = user.factory_id;
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
      .from("customers")
      .select("id")
      .eq("govt_id", Number(govt_id))
      .eq("factory_id", factoryId)
      .is("deleted_at", null);

    const { data: existingCustomer } = await existingQuery.maybeSingle();
    if (existingCustomer) {
      return apiError(ApiErrorMessage.GOVT_ID_EXISTS, StatusCodes.BAD_REQUEST);
    }
  }

  let passwordHash: string | null = null;
  if (username && password) {
    const { data: existingUser } = await client
      .from("users")
      .select("id")
      .eq("username", username)
      .is("deleted_at", null)
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

  return formatEntityResponse(newCustomer, StatusCodes.CREATED, { factory });
});

export const DELETE = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.CUSTOMERS, PermissionKey.DELETE)) return forbiddenError();
  const ids = parseBulkIds(await req.json());
  if (!ids) return apiError(ApiErrorMessage.PROVIDE_VALID_IDS, StatusCodes.BAD_REQUEST);

  // Check if any active entries are linked to any of the selected customers
  const { data: linkedEntries } = await client
    .from("entries")
    .select("id")
    .in("customer_id", ids)
    .is("deleted_at", null)
    .limit(1);

  if (linkedEntries && linkedEntries.length > 0) {
    return apiError(ApiErrorMessage.CANNOT_DELETE_SELECTED_CUSTOMERS, StatusCodes.BAD_REQUEST);
  }

  const { data: deletedCount, error } = await client.rpc("delete_customers_with_user", {
    p_customer_ids: ids,
    p_factory_id: user.factory_id,
  });

  if (error) {
    return apiError(
      error.message || ApiErrorMessage.CANNOT_DELETE_SELECTED_CUSTOMERS,
      StatusCodes.BAD_REQUEST,
    );
  }

  if (deletedCount !== ids.length) {
    return apiError(ApiErrorMessage.ONE_OR_MORE_CUSTOMERS_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  return NextResponse.json({ success: true, deleted_count: deletedCount });
});
