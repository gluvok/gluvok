import { eq, ilike, desc, asc, or } from "drizzle-orm";
import { commodities } from "@/db/schema";
import {
  withAuth,
  getPaginationParams,
  validateRequiredFields,
  forbiddenError,
  hasPermission,
  StatusCodes,
  fetchPaginatedResult,
  formatEntityResponse,
} from "@/db/helpers";
import {
  ProjectSlug,
  QueryParam,
  PermissionKey,
  EntityKey,
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
      created_at: commodities.createdAt,
      updated_at: commodities.updatedAt,
    })
    .from(commodities);

  const orderByClause = (() => {
    switch (sortColumn) {
      case EntityKey.ID:
        return sortDesc ? desc(commodities.id) : asc(commodities.id);
      case EntityKey.NAME:
        return sortDesc ? desc(commodities.name) : asc(commodities.name);
      case EntityKey.CREATED_AT:
        return sortDesc
          ? desc(commodities.createdAt)
          : asc(commodities.createdAt);
      case EntityKey.UPDATED_AT:
        return sortDesc
          ? desc(commodities.updatedAt)
          : asc(commodities.updatedAt);
      default:
        return desc(commodities.createdAt);
    }
  })();

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
