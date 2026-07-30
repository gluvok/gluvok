import { eq, and, desc, asc, gte, lte, ilike, or, count } from "drizzle-orm";
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
    sharedSchema.rates.factoryId,
  );
  const conditions = [];
  if (factoryCond) conditions.push(factoryCond);
  if (commodityIdParam && commodityIdParam !== FilterValue.ALL)
    conditions.push(eq(rates.commodityId, Number(commodityIdParam)));
  if (unitParam && unitParam !== FilterValue.ALL)
    conditions.push(eq(rates.unit, unitParam as Unit));
  if (startDateParam)
    conditions.push(gte(rates.createdAt, new Date(startDateParam)));
  if (endDateParam)
    conditions.push(lte(rates.createdAt, new Date(endDateParam)));

  if (search) {
    const searchNum = parseInt(search, 10);
    const searchConds = [
      ilike(commodities.name, `%${search}%`),
      ilike(rates.unitPrice, `%${search}%`),
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
      commodity_id: rates.commodityId,
      unit_price: rates.unitPrice,
      unit: rates.unit,
      ...(mode === TenantMode.SHARED
        ? { factory_id: sharedSchema.rates.factoryId }
        : {}),
      created_at: rates.createdAt,
      updated_at: rates.updatedAt,
      commodity_name: commodities.name,
    })
    .from(rates)
    .leftJoin(commodities, eq(rates.commodityId, commodities.id))
    .$dynamic();

  const countQuery = db
    .select({ count: count() })
    .from(rates)
    .leftJoin(commodities, eq(rates.commodityId, commodities.id))
    .$dynamic();

  const orderByClause = (() => {
    switch (sortColumn) {
      case EntityKey.ID:
        return sortDesc ? desc(rates.id) : asc(rates.id);
      case EntityKey.COMMODITY_NAME:
        return sortDesc ? desc(commodities.name) : asc(commodities.name);
      case EntityKey.UNIT_PRICE:
        return sortDesc ? desc(rates.unitPrice) : asc(rates.unitPrice);
      case EntityKey.UNIT:
        return sortDesc ? desc(rates.unit) : asc(rates.unit);
      case EntityKey.CREATED_AT:
        return sortDesc ? desc(rates.createdAt) : asc(rates.createdAt);
      case EntityKey.UPDATED_AT:
        return sortDesc ? desc(rates.updatedAt) : asc(rates.updatedAt);
      default:
        return desc(rates.createdAt);
    }
  })();

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
    commodityId: Number(commodity_id),
    unitPrice: String(unit_price),
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
    insertValues.factoryId = targetFactoryId;
  }

  const [newRate] = await db
    .insert(rates)
    .values(insertValues as typeof sharedSchema.rates.$inferInsert)
    .returning();
  return formatEntityResponse(newRate, mode, StatusCodes.CREATED);
});
