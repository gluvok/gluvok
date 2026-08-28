import {
  withAuth,
  getPaginationParams,
  fetchPaginatedResult,
  forbiddenError,
  hasPermission,
} from "@/db/helpers";
import { QueryParam, TableName, ProjectSlug, PermissionKey } from "@/lib/constants/enums";

export const GET = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.COMMODITIES, PermissionKey.READ)) return forbiddenError();
  const pagination = getPaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH);
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN) || "created_at";
  const sortDesc = req.nextUrl.searchParams.has(QueryParam.SORT_DESC)
    ? req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true"
    : true;

  let query = client
    .from(TableName.COMMODITIES)
    .select("*", { count: "exact" })
    .order(sortColumn, { ascending: !sortDesc })
    .is("deleted_at", null);

  if (search) {
    const searchNum = parseInt(search, 10);
    if (!isNaN(searchNum)) {
      query = query.or(`name.ilike.%${search}%,id.eq.${searchNum}`);
    } else {
      query = query.ilike("name", `%${search}%`);
    }
  }

  return fetchPaginatedResult(query, pagination);
});
