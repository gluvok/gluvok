import { NextResponse } from "next/server";
import { eq, ilike, and, or, count, inArray } from "drizzle-orm";
import { getTables, sharedSchema } from "@/db/schema";
import {
  withAuth,
  apiError,
  getPaginationParams,
  validateRequiredFields,
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
  QueryParam,
  PermissionKey,
} from "@/lib/constants/enums";

export const GET = withAuth(async (req, user, db, mode) => {
  const pagination = getPaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH);
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN);
  const sortDesc =
    req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true";

  const { centers } = getTables(mode);

  const factoryCond = getFactoryWhereClause(
    user,
    mode,
    sharedSchema.centers.factory_id,
  );
  const conditions = [];
  if (factoryCond) conditions.push(factoryCond);

  if (search) {
    const searchNum = parseInt(search, 10);
    const searchConds = [ilike(centers.name, `%${search}%`)];
    if (!isNaN(searchNum)) {
      searchConds.push(eq(centers.id, searchNum));
    }
    conditions.push(or(...searchConds));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const baseQuery = db
    .select({
      id: centers.id,
      name: centers.name,
      ...(mode === TenantMode.SHARED
        ? { factory_id: sharedSchema.centers.factory_id }
        : {}),
      created_at: centers.created_at,
      updated_at: centers.updated_at,
    })
    .from(centers)
    .$dynamic();

  const countQuery = db.select({ count: count() }).from(centers).$dynamic();

  const orderByClause = getOrderByClause(centers, sortColumn, sortDesc, centers.created_at);

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
  if (!hasPermission(user, ProjectSlug.CENTERS, PermissionKey.CREATE))
    return forbiddenError();
  const body = await req.json();
  const err = validateRequiredFields(body, ProjectSlug.CENTERS);
  if (err) return err;

  const { name } = body;
  const { centers } = getTables(mode) as unknown as {
    centers: Parameters<typeof db.insert>[0];
  };

  const insertValues: Record<string, unknown> = { name };
  if (mode === TenantMode.SHARED) {
    insertValues.factory_id = user.factory_id ?? 0;
  }

  const [newCenter] = await db
    .insert(centers)
    .values(insertValues as typeof sharedSchema.centers.$inferInsert)
    .returning();
  return formatEntityResponse(newCenter, mode, StatusCodes.CREATED);
});

export const DELETE = withAuth(async (req, user, db, mode) => {
  if (!hasPermission(user, ProjectSlug.CENTERS, PermissionKey.DELETE))
    return forbiddenError();
  const ids = parseBulkIds(await req.json());
  if (!ids)
    return apiError(
      "Provide between 1 and 100 valid IDs",
      StatusCodes.BAD_REQUEST,
    );

  const { centers } = getTables(mode);
  const whereClause = getFactoryWhereClause(
    user,
    mode,
    sharedSchema.centers.factory_id,
  );
  if (mode === TenantMode.SHARED && !whereClause) return forbiddenError();
  const scopedIds = whereClause
    ? and(inArray(centers.id, ids), whereClause)
    : inArray(centers.id, ids);

  try {
    const deletedCount = await db.transaction(async (tx) => {
      const deleted = await tx
        .delete(centers)
        .where(scopedIds)
        .returning({ id: centers.id });
      if (deleted.length !== ids.length)
        throw new Error("BULK_DELETE_INCOMPLETE");
      return deleted.length;
    });
    return NextResponse.json({ success: true, deleted_count: deletedCount });
  } catch (error) {
    if (error instanceof Error && error.message === "BULK_DELETE_INCOMPLETE") {
      return apiError(
        "One or more centers were not found",
        StatusCodes.NOT_FOUND,
      );
    }
    if (isFKViolation(error)) {
      return apiError(
        "Cannot delete selected centers because they are referenced by existing weighments.",
        StatusCodes.BAD_REQUEST,
      );
    }
    throw error;
  }
});
