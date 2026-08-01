import { NextResponse } from "next/server";
import { eq, ilike, and, or, count, inArray } from "drizzle-orm";
import { getTables, sharedSchema } from "@/db/schema";
import {
  withAuth,
  getPaginationParams,
  apiError,
  forbiddenError,
  hasPermission,
  StatusCodes,
  getFactoryConfig,
  getFactoryWhereClause,
  fetchPaginatedResult,
  formatEntityResponse,
  isFKViolation,
  parseBulkIds,
  getOrderByClause,
} from "@/db/helpers";
import {
  Role,
  TenantMode,
  ProjectSlug,
  PermissionKey,
  QueryParam,
  FieldRequirementMode,
} from "@/lib/constants/enums";
import { hashPassword } from "@/lib/auth/password";
import { getDynamicCustomerSchema } from "@/lib/validation";

export const GET = withAuth(async (req, user, db, mode) => {
  const pagination = getPaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH);
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN);
  const sortDesc =
    req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true";

  const { customers, users } = getTables(mode);

  const activeConfig = await getFactoryConfig(user.factory_id, db, mode);
  const isGovtIdNotRequired =
    activeConfig?.govtIdMode === FieldRequirementMode.NOT_REQUIRED;

  const factoryCond = getFactoryWhereClause(
    user,
    mode,
    sharedSchema.customers.factory_id,
  );
  const conditions = [];
  if (factoryCond) conditions.push(factoryCond);

  if (search) {
    const searchNum = parseInt(search, 10);
    const searchConds = [
      ilike(customers.name, `%${search}%`),
      ilike(customers.father_name, `%${search}%`),
    ];
    if (!isNaN(searchNum)) {
      searchConds.push(eq(customers.id, searchNum));
      if (!isGovtIdNotRequired) {
        searchConds.push(eq(customers.govt_id, searchNum));
      }
    }
    conditions.push(or(...searchConds));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const baseQuery = db
    .select({
      id: customers.id,
      ...(isGovtIdNotRequired ? {} : { govt_id: customers.govt_id }),
      name: customers.name,
      father_name: customers.father_name,
      user_id: customers.user_id,
      ...(mode === TenantMode.SHARED
        ? { factory_id: sharedSchema.customers.factory_id }
        : {}),
      created_at: customers.created_at,
      updated_at: customers.updated_at,
      username: users.username,
      is_active: users.is_active,
    })
    .from(customers)
    .leftJoin(users, eq(customers.user_id, users.id))
    .$dynamic();

  const countQuery = db
    .select({ count: count() })
    .from(customers)
    .leftJoin(users, eq(customers.user_id, users.id))
    .$dynamic();

  const sortable = { ...customers, ...users };
  const orderByClause = getOrderByClause(sortable, sortColumn, sortDesc, customers.created_at);

  return fetchPaginatedResult(
    db,
    countQuery,
    baseQuery,
    whereClause,
    pagination,
    orderByClause,
  );
});

export const POST = withAuth(async (req, user, db, mode) => {
  if (!hasPermission(user, ProjectSlug.CUSTOMERS, PermissionKey.CREATE))
    return forbiddenError();
  const body = await req.json();

  const targetFactoryId = user.factory_id ?? 0;
  const activeConfig = await getFactoryConfig(targetFactoryId, db, mode);

  const dynamicSchema = getDynamicCustomerSchema(activeConfig);
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

  const { customers, users } = getTables(mode);

  if (govt_id != null) {
    const existingConds = [eq(sharedSchema.customers.govt_id, Number(govt_id))];
    if (mode === TenantMode.SHARED)
      existingConds.push(eq(sharedSchema.customers.factory_id, targetFactoryId));
    const [existingCustomer] = await db
      .select({ id: sharedSchema.customers.id })
      .from(customers)
      .where(and(...existingConds));
    if (existingCustomer) {
      return apiError(
        mode === TenantMode.SHARED
          ? "Govt ID already exists in this factory"
          : "Govt ID already exists",
        StatusCodes.BAD_REQUEST,
      );
    }
  }

  let createdUserId: number | null = null;
  if (username && password) {
    const [existingUser] = await db
      .select({ id: sharedSchema.users.id })
      .from(users)
      .where(eq(sharedSchema.users.username, username));
    if (existingUser) {
      return apiError("Username is already taken", StatusCodes.BAD_REQUEST);
    }

    const passwordHash = await hashPassword(password);
    const userValues = {
      username,
      password_hash: passwordHash,
      role: Role.BASE,
      ...(mode === TenantMode.SHARED ? { factory_id: targetFactoryId } : {}),
    };
    const [newUser] = await db
      .insert(users as typeof sharedSchema.users)
      .values(userValues as typeof sharedSchema.users.$inferInsert)
      .returning();
    createdUserId = newUser.id;
  }

  const customerValues = {
    ...(govt_id != null ? { govt_id: Number(govt_id) } : {}),
    name,
    father_name: father_name,
    user_id: createdUserId,
    ...(mode === TenantMode.SHARED ? { factory_id: targetFactoryId } : {}),
  };

  const [newCustomer] = await db
    .insert(customers as typeof sharedSchema.customers)
    .values(customerValues as typeof sharedSchema.customers.$inferInsert)
    .returning();
  return formatEntityResponse(newCustomer, mode, StatusCodes.CREATED);
});

export const DELETE = withAuth(async (req, user, db, mode) => {
  if (!hasPermission(user, ProjectSlug.CUSTOMERS, PermissionKey.DELETE))
    return forbiddenError();
  const ids = parseBulkIds(await req.json());
  if (!ids)
    return apiError(
      "Provide between 1 and 100 valid IDs",
      StatusCodes.BAD_REQUEST,
    );

  const { customers } = getTables(mode);
  const factoryScope = getFactoryWhereClause(
    user,
    mode,
    sharedSchema.customers.factory_id,
  );
  if (mode === TenantMode.SHARED && !factoryScope) return forbiddenError();
  const scopedIds = factoryScope
    ? and(inArray(customers.id, ids), factoryScope)
    : inArray(customers.id, ids);

  try {
    const deletedCount = await db.transaction(async (tx) => {
      const deleted = await tx
        .delete(customers)
        .where(scopedIds)
        .returning({ id: customers.id });
      if (deleted.length !== ids.length)
        throw new Error("BULK_DELETE_INCOMPLETE");
      return deleted.length;
    });
    return NextResponse.json({ success: true, deleted_count: deletedCount });
  } catch (error) {
    if (error instanceof Error && error.message === "BULK_DELETE_INCOMPLETE") {
      return apiError(
        "One or more customers were not found",
        StatusCodes.NOT_FOUND,
      );
    }
    if (isFKViolation(error)) {
      return apiError(
        "Cannot delete selected customers because they are referenced by existing weighments.",
        StatusCodes.BAD_REQUEST,
      );
    }
    throw error;
  }
});
