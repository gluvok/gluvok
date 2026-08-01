import { NextResponse } from "next/server";
import {
  eq,
  and,
  gte,
  lte,
  ilike,
  or,
  count,
  inArray,
} from "drizzle-orm";
import { getTables, sharedSchema } from "@/db/schema";
import {
  withAuth,
  getPaginationParams,
  validateRequiredFields,
  apiError,
  forbiddenError,
  hasPermission,
  StatusCodes,
  getFactoryWhereClause,
  fetchPaginatedResult,
  formatEntityResponse,
  isFKViolation,
  parseBulkIds,
  getOrderByClause,
} from "@/db/helpers";
import {
  TenantMode,
  ProjectSlug,
  PermissionKey,
  EntityKey,
  FilterValue,
  Unit,
  QueryParam,
} from "@/lib/constants/enums";

export const GET = withAuth(async (req, user, db, mode) => {
  const pagination = getPaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH);
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN);
  const sortDesc =
    req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true";
  const commodityIdParam = req.nextUrl.searchParams.get(EntityKey.COMMODITY_ID);
  const unitParam = req.nextUrl.searchParams.get(EntityKey.UNIT);
  const startDateParam = req.nextUrl.searchParams.get(QueryParam.START_DATE);
  const endDateParam = req.nextUrl.searchParams.get(QueryParam.END_DATE);

  const { rates, commodities } = getTables(mode);

  const factoryCond = getFactoryWhereClause(
    user,
    mode,
    sharedSchema.rates.factory_id,
  );
  const conditions = [];
  if (factoryCond) conditions.push(factoryCond);
  if (commodityIdParam && commodityIdParam !== FilterValue.ALL)
    conditions.push(eq(rates.commodity_id, Number(commodityIdParam)));
  if (unitParam && unitParam !== FilterValue.ALL)
    conditions.push(eq(rates.unit, unitParam as Unit));
  if (startDateParam)
    conditions.push(gte(rates.created_at, new Date(startDateParam)));
  if (endDateParam)
    conditions.push(lte(rates.created_at, new Date(endDateParam)));

  if (search) {
    const searchNum = parseInt(search, 10);
    const searchConds = [
      ilike(commodities.name, `%${search}%`),
      ilike(rates.unit_price, `%${search}%`),
    ];
    if (!isNaN(searchNum)) {
      searchConds.push(eq(rates.id, searchNum));
    }
    conditions.push(or(...searchConds));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const baseQuery = db
    .select({
      id: rates.id,
      commodity_id: rates.commodity_id,
      unit_price: rates.unit_price,
      unit: rates.unit,
      ...(mode === TenantMode.SHARED
        ? { factory_id: sharedSchema.rates.factory_id }
        : {}),
      created_at: rates.created_at,
      updated_at: rates.updated_at,
      commodity_name: commodities.name,
    })
    .from(rates)
    .leftJoin(commodities, eq(rates.commodity_id, commodities.id))
    .$dynamic();

  const countQuery = db
    .select({ count: count() })
    .from(rates)
    .leftJoin(commodities, eq(rates.commodity_id, commodities.id))
    .$dynamic();

  const sortable = { ...rates, commodity_name: commodities.name };
  const orderByClause = getOrderByClause(sortable, sortColumn, sortDesc, rates.created_at);

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
  if (!hasPermission(user, ProjectSlug.RATES, PermissionKey.CREATE))
    return forbiddenError();
  const body = await req.json();
  const err = validateRequiredFields(body, ProjectSlug.RATES);
  if (err) return err;

  const { commodity_id, unit_price, unit } = body;
  const { rates } = getTables(mode) as unknown as {
    rates: Parameters<typeof db.insert>[0];
  };

  const insertValues: Record<string, unknown> = {
    commodity_id: Number(commodity_id),
    unit_price: String(unit_price),
    unit,
  };

  if (mode === TenantMode.SHARED) {
    const targetFactoryId = user.factory_id;
    if (targetFactoryId == null) {
      return apiError(
        "User is not associated with a factory",
        StatusCodes.BAD_REQUEST,
      );
    }
    insertValues.factory_id = targetFactoryId;
  }

  const [newRate] = await db
    .insert(rates)
    .values(insertValues as typeof sharedSchema.rates.$inferInsert)
    .returning();
  return formatEntityResponse(newRate, mode, StatusCodes.CREATED);
});

export const DELETE = withAuth(async (req, user, db, mode) => {
  if (!hasPermission(user, ProjectSlug.RATES, PermissionKey.DELETE))
    return forbiddenError();
  const ids = parseBulkIds(await req.json());
  if (!ids)
    return apiError(
      "Provide between 1 and 100 valid IDs",
      StatusCodes.BAD_REQUEST,
    );

  const { rates } = getTables(mode);
  const factoryScope = getFactoryWhereClause(
    user,
    mode,
    sharedSchema.rates.factory_id,
  );
  if (mode === TenantMode.SHARED && !factoryScope) return forbiddenError();
  const scopedIds = factoryScope
    ? and(inArray(rates.id, ids), factoryScope)
    : inArray(rates.id, ids);

  try {
    const deletedCount = await db.transaction(async (tx) => {
      const deleted = await tx
        .delete(rates)
        .where(scopedIds)
        .returning({ id: rates.id });
      if (deleted.length !== ids.length)
        throw new Error("BULK_DELETE_INCOMPLETE");
      return deleted.length;
    });
    return NextResponse.json({ success: true, deleted_count: deletedCount });
  } catch (error) {
    if (error instanceof Error && error.message === "BULK_DELETE_INCOMPLETE") {
      return apiError(
        "One or more rates were not found",
        StatusCodes.NOT_FOUND,
      );
    }
    if (isFKViolation(error)) {
      return apiError(
        "Cannot delete selected rates because they are referenced by existing weighments.",
        StatusCodes.BAD_REQUEST,
      );
    }
    throw error;
  }
});
