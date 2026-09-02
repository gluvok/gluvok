import {
  withAuth,
  getPaginationParams,
  forbiddenError,
  hasPermission,
  fetchPaginatedResult,
} from "@/db/helpers";
import { ProjectSlug, PermissionKey } from "@/lib/constants/enums";

export const GET = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.SETTINGS, PermissionKey.READ)) return forbiddenError();

  const pagination = getPaginationParams(req.nextUrl);
  const sortColumn = req.nextUrl.searchParams.get("sort_column") || "created_at";
  const sortDesc = req.nextUrl.searchParams.has("sort_desc")
    ? req.nextUrl.searchParams.get("sort_desc") === "true"
    : true;

  const query = client
    .from("factories")
    .select("*", { count: "exact" })
    .order(sortColumn, { ascending: !sortDesc })
    .eq("id", user.factory_id)
    .is("deleted_at", null);

  return fetchPaginatedResult(query, pagination);
});
