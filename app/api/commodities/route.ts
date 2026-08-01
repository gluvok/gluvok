import { NextResponse } from "next/server";
import { eq, ilike, or, inArray } from "drizzle-orm";
import { commodities } from "@/db/schema";
import {
  withAuth,
  apiError,
  getPaginationParams,
  validateRequiredFields,
  forbiddenError,
  hasPermission,
  StatusCodes,
  fetchPaginatedResult,
  formatEntityResponse,
  isFKViolation,
  parseBulkIds,
  getOrderByClause,
} from "@/db/helpers";
import {
  ProjectSlug,
  QueryParam,
  PermissionKey,
} from "@/lib/constants/enums";

export const GET = withAuth(async (req, _user, db) => {
  const pagination = getPaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH);
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN);
  const sortDesc =
    req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true";
  const searchNum = search ? parseInt(search, 10) : NaN;

  const whereClause = search
    ? !isNaN(searchNum)
      ? or(
          ilike(commodities.name, `%${search}%`),
          eq(commodities.id, searchNum),
        )
      : ilike(commodities.name, `%${search}%`)
    : undefined;

  const baseQuery = db
    .select({
      id: commodities.id,
      name: commodities.name,
      created_at: commodities.created_at,
      updated_at: commodities.updated_at,
    })
    .from(commodities);

  const orderByClause = getOrderByClause(commodities, sortColumn, sortDesc, commodities.created_at);

  return fetchPaginatedResult(
    db,
    commodities,
    baseQuery,
    whereClause,
    pagination,
    orderByClause,
  );
});

export const POST = withAuth(async (req, user, db, mode) => {
  if (!hasPermission(user, ProjectSlug.COMMODITIES, PermissionKey.CREATE))
    return forbiddenError();
  const body = await req.json();
  const err = validateRequiredFields(body, ProjectSlug.COMMODITIES);
  if (err) return err;

  const { name } = body;
  const [newCommodity] = await db
    .insert(commodities)
    .values({ name })
    .returning();

  return formatEntityResponse(newCommodity, mode, StatusCodes.CREATED);
});

export const DELETE = withAuth(async (req, user, db) => {
  if (!hasPermission(user, ProjectSlug.COMMODITIES, PermissionKey.DELETE))
    return forbiddenError();
  const ids = parseBulkIds(await req.json());
  if (!ids)
    return apiError(
      "Provide between 1 and 100 valid IDs",
      StatusCodes.BAD_REQUEST,
    );

  try {
    const deletedCount = await db.transaction(async (tx) => {
      const deleted = await tx
        .delete(commodities)
        .where(inArray(commodities.id, ids))
        .returning({ id: commodities.id });
      if (deleted.length !== ids.length)
        throw new Error("BULK_DELETE_INCOMPLETE");
      return deleted.length;
    });
    return NextResponse.json({ success: true, deleted_count: deletedCount });
  } catch (error) {
    if (error instanceof Error && error.message === "BULK_DELETE_INCOMPLETE") {
      return apiError(
        "One or more commodities were not found",
        StatusCodes.NOT_FOUND,
      );
    }
    if (isFKViolation(error)) {
      return apiError(
        "Cannot delete selected commodities because they are referenced by existing rates or weighments.",
        StatusCodes.BAD_REQUEST,
      );
    }
    throw error;
  }
});
