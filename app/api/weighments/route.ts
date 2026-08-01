import { NextResponse } from "next/server";
import {
  eq,
  ilike,
  and,
  desc,
  asc,
  or,
  gte,
  lte,
  count,
  inArray,
} from "drizzle-orm";
import {
  weighments,
  rates,
  commodities,
  centers,
  profiles,
  customers,
  users,
  sharedSchema,
} from "@/db/schema";
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
} from "@/db/helpers";
import {
  TenantMode,
  ProjectSlug,
  PermissionKey,
  QueryParam,
  Unit,
  WeighmentType,
  EntityKey,
  FilterValue,
} from "@/lib/constants/enums";

export const GET = withAuth(async (req, user, db, mode) => {
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
    sharedSchema.centers.factoryId,
  );
  const conditions = [];
  if (factoryCond) conditions.push(factoryCond);
  if (unitParam && unitParam !== FilterValue.ALL)
    conditions.push(eq(weighments.unit, unitParam as Unit));
  if (centerIdParam && centerIdParam !== FilterValue.ALL)
    conditions.push(eq(weighments.centerId, Number(centerIdParam)));
  if (commodityIdParam && commodityIdParam !== FilterValue.ALL)
    conditions.push(eq(rates.commodityId, Number(commodityIdParam)));
  if (typeParam && typeParam !== FilterValue.ALL)
    conditions.push(eq(weighments.type, typeParam as WeighmentType));
  if (isActiveParam && isActiveParam !== FilterValue.ALL)
    conditions.push(eq(weighments.isActive, isActiveParam === "true"));
  if (startDateParam)
    conditions.push(gte(weighments.createdAt, new Date(startDateParam)));
  if (endDateParam)
    conditions.push(lte(weighments.createdAt, new Date(endDateParam)));

  if (search) {
    const searchConds = [
      ilike(weighments.vehicleNumber, `%${search}%`),
      ilike(customers.name, `%${search}%`),
      ilike(users.name, `%${search}%`),
      ilike(centers.name, `%${search}%`),
    ];
    conditions.push(or(...searchConds));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countQuery = db
    .select({ count: count() })
    .from(weighments)
    .leftJoin(centers, eq(weighments.centerId, centers.id))
    .leftJoin(customers, eq(weighments.customerId, customers.id))
    .leftJoin(profiles, eq(weighments.profileId, profiles.id))
    .leftJoin(users, eq(profiles.userId, users.id))
    .$dynamic();

  const baseQuery = db
    .select({
      id: weighments.id,
      vehicle_number: weighments.vehicleNumber,
      weight: weighments.weight,
      unit: weighments.unit,
      type: weighments.type,
      rate_id: weighments.rateId,
      center_id: weighments.centerId,
      profile_id: weighments.profileId,
      customer_id: weighments.customerId,
      is_active: weighments.isActive,
      images: weighments.images,
      created_at: weighments.createdAt,
      updated_at: weighments.updatedAt,
      commodity_name: commodities.name,
      center_name: centers.name,
      profile_name: users.name,
      profile_aadhar: profiles.aadharNumber,
      customer_name: customers.name,
      customer_govt_id: customers.govtId,
    })
    .from(weighments)
    .leftJoin(rates, eq(weighments.rateId, rates.id))
    .leftJoin(commodities, eq(rates.commodityId, commodities.id))
    .leftJoin(centers, eq(weighments.centerId, centers.id))
    .leftJoin(profiles, eq(weighments.profileId, profiles.id))
    .leftJoin(users, eq(profiles.userId, users.id))
    .leftJoin(customers, eq(weighments.customerId, customers.id))
    .$dynamic();

  const orderByClause = (() => {
    switch (sortColumn) {
      case EntityKey.ID:
        return sortDesc ? desc(weighments.id) : asc(weighments.id);
      case EntityKey.VEHICLE_NUMBER:
        return sortDesc
          ? desc(weighments.vehicleNumber)
          : asc(weighments.vehicleNumber);
      case EntityKey.TYPE:
        return sortDesc ? desc(weighments.type) : asc(weighments.type);
      case EntityKey.WEIGHT:
        return sortDesc ? desc(weighments.weight) : asc(weighments.weight);
      case EntityKey.UNIT:
        return sortDesc ? desc(weighments.unit) : asc(weighments.unit);
      case EntityKey.RATE_ID:
        return sortDesc ? desc(weighments.rateId) : asc(weighments.rateId);
      case EntityKey.CENTER_ID:
        return sortDesc ? desc(weighments.centerId) : asc(weighments.centerId);
      case EntityKey.CENTER_NAME:
        return sortDesc ? desc(centers.name) : asc(centers.name);
      case EntityKey.PROFILE_ID:
        return sortDesc
          ? desc(weighments.profileId)
          : asc(weighments.profileId);
      case EntityKey.PROFILE_NAME:
        return sortDesc ? desc(users.name) : asc(users.name);
      case EntityKey.PROFILE_AADHAR:
        return sortDesc
          ? desc(profiles.aadharNumber)
          : asc(profiles.aadharNumber);
      case EntityKey.CUSTOMER_ID:
        return sortDesc
          ? desc(weighments.customerId)
          : asc(weighments.customerId);
      case EntityKey.CUSTOMER_NAME:
        return sortDesc ? desc(customers.name) : asc(customers.name);
      case EntityKey.CUSTOMER_GOVT_ID:
        return sortDesc ? desc(customers.govtId) : asc(customers.govtId);
      case EntityKey.COMMODITY_NAME:
        return sortDesc ? desc(commodities.name) : asc(commodities.name);
      case EntityKey.IS_ACTIVE:
        return sortDesc ? desc(weighments.isActive) : asc(weighments.isActive);
      case EntityKey.CREATED_AT:
        return sortDesc
          ? desc(weighments.createdAt)
          : asc(weighments.createdAt);
      case EntityKey.UPDATED_AT:
        return sortDesc
          ? desc(weighments.updatedAt)
          : asc(weighments.updatedAt);
      default:
        return desc(weighments.createdAt);
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

  // Ensure center belongs to user's factory in shared mode
  const [center] = await db
    .select(
      mode === TenantMode.SHARED
        ? { factoryId: sharedSchema.centers.factoryId }
        : { id: centers.id },
    )
    .from(centers)
    .where(eq(centers.id, Number(center_id)));
  if (!center)
    return apiError("Selected center not found", StatusCodes.NOT_FOUND);
  if (mode === TenantMode.SHARED) {
    const c = center as { factoryId: number };
    if (c.factoryId !== user.factory_id) return forbiddenError();
  }

  const [newWeighment] = await db
    .insert(weighments)
    .values({
      vehicleNumber: vehicle_number,
      weight: String(weight),
      unit: unit || Unit.KG,
      type: type || WeighmentType.IN,
      rateId: Number(rate_id),
      centerId: Number(center_id),
      profileId: Number(profile_id),
      customerId: Number(customer_id),
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

  const ownershipScope =
    mode === TenantMode.SHARED
      ? and(
          inArray(weighments.id, ids),
          eq(sharedSchema.centers.factoryId, factoryId),
        )
      : inArray(weighments.id, ids);
  const scopedWeighmentIds = db
    .select({ id: weighments.id })
    .from(weighments)
    .innerJoin(centers, eq(weighments.centerId, centers.id))
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
