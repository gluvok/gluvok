import { withAuth, getPaginationParams, fetchPaginatedResult } from "@/db/helpers";
import { QueryParam, TableName, EntityKey } from "@/lib/constants/enums";

export const GET = withAuth(async (req, user, client) => {
  const pagination = getPaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH);
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN) || EntityKey.CREATED_AT;
  const sortDesc = req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true";

  let query = client
    .from(TableName.COMMODITIES)
    .select("*", { count: "exact" })
    .order(sortColumn, { ascending: !sortDesc })
    .is(EntityKey.DELETED_AT, null);

  if (search) {
    const searchNum = parseInt(search, 10);
    if (!isNaN(searchNum)) {
      query = query.or(`${EntityKey.NAME}.ilike.%${search}%,${EntityKey.ID}.eq.${searchNum}`);
    } else {
      query = query.ilike(EntityKey.NAME, `%${search}%`);
    }
  }

  return fetchPaginatedResult(query, pagination);
});
