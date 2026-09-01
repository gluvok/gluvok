import {
  withAuth,
  getPaginationParams,
  fetchPaginatedResult,
  forbiddenError,
  hasPermission,
} from "@/db/helpers";
import { ProjectSlug, PermissionKey } from "@/lib/constants/enums";

export const GET = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.COMMODITIES, PermissionKey.READ)) return forbiddenError();
  const pagination = getPaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get("search");
  const sortColumn = req.nextUrl.searchParams.get("sort_column") || "created_at";
  const sortDesc = req.nextUrl.searchParams.has("sort_desc")
    ? req.nextUrl.searchParams.get("sort_desc") === "true"
    : true;

  let query = client
    .from("commodities")
    .select("*", { count: "exact" })
    .order(sortColumn, { ascending: !sortDesc })
    .is("deleted_at", null);

  if (search) {
    const searchNum = parseInt(search, 10);
    if (!isNaN(searchNum)) {
      query = query.eq("id", searchNum);
    } else {
      query = query.ilike("name", `%${search}%`);
    }
  }

  return fetchPaginatedResult(query, pagination);
});
