import { NextResponse } from "next/server";
import { eq, ilike, and, or, count, inArray, gte, lte } from "drizzle-orm";
import { getTables, sharedSchema } from "@/db/schema";
import {
  withAuth,
  getPaginationParams,
  apiError,
  forbiddenError,
  hasPermission,
  StatusCodes,
  getFactoryWhereClause,
  fetchPaginatedResult,
  formatEntityResponse,
  isFKViolation,
  parseBulkIds,
  validateRequiredFields,
  getOrderByClause,
} from "@/db/helpers";
import {
  Unit,
  WeighmentType,
  TenantMode,
  ProjectSlug,
  PermissionKey,
  QueryParam,
  EntityKey,
  FilterValue,
} from "@/lib/constants/enums";

export const GET = withAuth(async (req, user, db, mode) => {
  const { weighments, centers, customers, profiles, users, rates, commodities } =
    getTables(mode);

  const pagination = getPaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH);
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN);
  const sortDesc =
    req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true";
  const unitParam = req.nextUrl.searchParams.get(EntityKey.UNIT);
  const centerIdParam = req.nextUrl.searchParams.get(EntityKey.CENTER_ID);
  const commodityIdParam = req.nextUrl.searchParams.get(EntityKey.COMMODITY_ID);
  const typeParam = req.nextUrl.searchParams.get(EntityKey.TYPE);
  const isActiveParam = req.nextUrl.searchParams.get(EntityKey.IS_ACTIVE);
  const startDateParam = req.nextUrl.searchParams.get(QueryParam.START_DATE);
  const endDateParam = req.nextUrl.searchParams.get(QueryParam.END_DATE);

  const factoryCond = getFactoryWhereClause(
    user,
    mode,
    sharedSchema.centers.factory_id,
  );
  const conditions = [];
  if (factoryCond) conditions.push(factoryCond);
  if (unitParam && unitParam !== FilterValue.ALL)
    conditions.push(eq(weighments.unit, unitParam as Unit));
  if (centerIdParam && centerIdParam !== FilterValue.ALL)
    conditions.push(eq(weighments.center_id, Number(centerIdParam)));
  if (commodityIdParam && commodityIdParam !== FilterValue.ALL)
    conditions.push(eq(rates.commodity_id, Number(commodityIdParam)));
  if (typeParam && typeParam !== FilterValue.ALL)
    conditions.push(eq(weighments.type, typeParam as WeighmentType));
  if (isActiveParam && isActiveParam !== FilterValue.ALL)
    conditions.push(eq(weighments.is_active, isActiveParam === "true"));
  if (startDateParam)
    conditions.push(gte(weighments.created_at, new Date(startDateParam)));
  if (endDateParam)
    conditions.push(lte(weighments.created_at, new Date(endDateParam)));

  if (search) {
    const searchConds = [
      ilike(weighments.vehicle_number, `%${search}%`),
      ilike(customers.name, `%${search}%`),
      ilike(profiles.name, `%${search}%`),
      ilike(centers.name, `%${search}%`),
    ];
    conditions.push(or(...searchConds));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countQuery = db
    .select({ count: count() })
    .from(weighments)
    .leftJoin(centers, eq(weighments.center_id, centers.id))
    .leftJoin(customers, eq(weighments.customer_id, customers.id))
    .leftJoin(profiles, eq(weighments.profile_id, profiles.id))
    .leftJoin(users, eq(profiles.user_id, users.id))
    .$dynamic();

  const baseQuery = db
    .select({
      id: weighments.id,
      vehicle_number: weighments.vehicle_number,
      weight: weighments.weight,
      unit: weighments.unit,
      type: weighments.type,
      rate_id: weighments.rate_id,
      center_id: weighments.center_id,
      profile_id: weighments.profile_id,
      customer_id: weighments.customer_id,
      is_active: weighments.is_active,
      images: weighments.images,
      created_at: weighments.created_at,
      updated_at: weighments.updated_at,
      commodity_name: commodities.name,
      center_name: centers.name,
      profile_name: profiles.name,
      profile_aadhar: profiles.aadhar_number,
      customer_name: customers.name,
      customer_govt_id: customers.govt_id,
    })
    .from(weighments)
    .leftJoin(rates, eq(weighments.rate_id, rates.id))
    .leftJoin(commodities, eq(rates.commodity_id, commodities.id))
    .leftJoin(centers, eq(weighments.center_id, centers.id))
    .leftJoin(profiles, eq(weighments.profile_id, profiles.id))
    .leftJoin(users, eq(profiles.user_id, users.id))
    .leftJoin(customers, eq(weighments.customer_id, customers.id))
    .$dynamic();

  const sortable = {
    ...weighments,
    center_name: centers.name,
    profile_name: profiles.name,
    profile_aadhar: profiles.aadhar_number,
    customer_name: customers.name,
    customer_govt_id: customers.govt_id,
    commodity_name: commodities.name,
  };
  const orderByClause = getOrderByClause(
    sortable,
    sortColumn,
    sortDesc,
    weighments.created_at,
  );

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
  if (!hasPermission(user, ProjectSlug.WEIGHMENTS, PermissionKey.CREATE))
    return forbiddenError();
  const body = await req.json();
  const err = validateRequiredFields(body, ProjectSlug.WEIGHMENTS);
  if (err) return err;

  const {
    vehicle_number,
    weight,
    unit,
    type,
    rate_id,
    center_id,
    profile_id,
    customer_id,
    images,
  } = body;

  const profileId = user.profile_id ?? Number(profile_id);
  if (!Number.isSafeInteger(profileId) || profileId <= 0) {
    return apiError("profile_id is required", StatusCodes.BAD_REQUEST);
  }
  if (user.profile_id != null && user.role !== "operator") {
    return forbiddenError();
  }

  const { weighments, centers } = getTables(mode);

  // Ensure center belongs to user's factory in shared mode
  const [center] = await db
    .select(
      mode === TenantMode.SHARED
        ? { factory_id: sharedSchema.centers.factory_id }
        : { id: centers.id },
    )
    .from(centers)
    .where(eq(centers.id, Number(center_id)));
  if (!center)
    return apiError("Selected center not found", StatusCodes.NOT_FOUND);
  if (mode === TenantMode.SHARED) {
    const c = center as { factory_id: number };
    if (c.factory_id !== user.factory_id) return forbiddenError();
  }

  const [newWeighment] = await db
    .insert(weighments)
    .values({
      vehicle_number: vehicle_number,
      weight: String(weight),
      unit: unit || Unit.KG,
      type: type || WeighmentType.IN,
      rate_id: rate_id === "" || rate_id === null || rate_id === undefined ? null : Number(rate_id),
      center_id: Number(center_id),
      profile_id: profileId,
      customer_id: customer_id === "" || customer_id === null || customer_id === undefined ? null : Number(customer_id),
      images: images || [],
    })
    .returning();

  return formatEntityResponse(newWeighment, mode, StatusCodes.CREATED);
});

export const DELETE = withAuth(async (req, user, db, mode) => {
  if (!hasPermission(user, ProjectSlug.WEIGHMENTS, PermissionKey.DELETE))
    return forbiddenError();
  const ids = parseBulkIds(await req.json());
  if (!ids)
    return apiError(
      "Provide between 1 and 100 valid IDs",
      StatusCodes.BAD_REQUEST,
    );
  if (mode === TenantMode.SHARED && user.factory_id == null)
    return forbiddenError();
  const factoryId = user.factory_id as number;

  const { weighments, centers } = getTables(mode);
  const ownershipScope =
    mode === TenantMode.SHARED
      ? and(
          inArray(weighments.id, ids),
          eq(sharedSchema.centers.factory_id, factoryId),
        )
      : inArray(weighments.id, ids);
  const scopedWeighmentIds = db
    .select({ id: weighments.id })
    .from(weighments)
    .innerJoin(centers, eq(weighments.center_id, centers.id))
    .where(ownershipScope);

  try {
    const deletedCount = await db.transaction(async (tx) => {
      const deleted = await tx
        .delete(weighments)
        .where(inArray(weighments.id, scopedWeighmentIds))
        .returning({ id: weighments.id });
      if (deleted.length !== ids.length)
        throw new Error("BULK_DELETE_INCOMPLETE");
      return deleted.length;
    });
    return NextResponse.json({ success: true, deleted_count: deletedCount });
  } catch (error) {
    if (error instanceof Error && error.message === "BULK_DELETE_INCOMPLETE") {
      return apiError(
        "One or more weighments were not found",
        StatusCodes.NOT_FOUND,
      );
    }
    if (isFKViolation(error)) {
      return apiError(
        "Cannot delete selected weighments because they are referenced by other records.",
        StatusCodes.BAD_REQUEST,
      );
    }
    throw error;
  }
});
