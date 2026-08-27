import { NextResponse } from "next/server";
import {
  withAuth,
  apiError,
  getPaginationParams,
  forbiddenError,
  hasPermission,
  StatusCodes,
  fetchPaginatedResult,
  formatEntityResponse,
  parseBulkIds,
} from "@/db/helpers";
import {
  ProjectSlug,
  QueryParam,
  PermissionKey,
  TableName,
  EntityKey,
} from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { addCenterSchema } from "@/lib/validation";

export const GET = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.CENTERS, PermissionKey.READ)) return forbiddenError();
  const pagination = getPaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH);
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN) || EntityKey.CREATED_AT;
  const sortDesc = req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true";

  let query = client
    .from(TableName.CENTERS)
    .select("*", { count: "exact" })
    .order(sortColumn, { ascending: !sortDesc })
    .eq(EntityKey.FACTORY_ID, user.factory_id)
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

export const POST = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.CENTERS, PermissionKey.CREATE)) return forbiddenError();
  const body = await req.json();
  const parsed = addCenterSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST);
  }

  const { name } = parsed.data;
  const insertValues: Record<string, unknown> = {
    [EntityKey.NAME]: name,
    [EntityKey.FACTORY_ID]: user.factory_id,
  };

  const { data: newCenter, error } = await client
    .from(TableName.CENTERS)
    .insert(insertValues)
    .select()
    .single();

  if (error) {
    console.error("POST center error:", error);
    return apiError(error.message || ApiErrorMessage.CREATE_CENTER_FAILED, StatusCodes.BAD_REQUEST);
  }

  return formatEntityResponse(newCenter, StatusCodes.CREATED);
});

export const DELETE = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.CENTERS, PermissionKey.DELETE)) return forbiddenError();
  const ids = parseBulkIds(await req.json());
  if (!ids) return apiError(ApiErrorMessage.PROVIDE_VALID_IDS, StatusCodes.BAD_REQUEST);

  // Check if any active entries are linked to any of the selected centers
  const { data: linkedEntries } = await client
    .from(TableName.ENTRIES)
    .select(EntityKey.ID)
    .in(EntityKey.CENTER_ID, ids)
    .is(EntityKey.DELETED_AT, null)
    .limit(1);

  if (linkedEntries && linkedEntries.length > 0) {
    return apiError(ApiErrorMessage.CANNOT_DELETE_SELECTED_CENTERS, StatusCodes.BAD_REQUEST);
  }

  const query = client
    .from(TableName.CENTERS)
    .update({
      [EntityKey.DELETED_AT]: new Date().toISOString(),
      [EntityKey.UPDATED_AT]: new Date().toISOString(),
    })
    .in(EntityKey.ID, ids)
    .is(EntityKey.DELETED_AT, null)
    .eq(EntityKey.FACTORY_ID, user.factory_id);

  const { data, error } = await query.select(EntityKey.ID);
  if (error) {
    return apiError(
      error.message || ApiErrorMessage.CANNOT_DELETE_SELECTED_CENTERS,
      StatusCodes.BAD_REQUEST,
    );
  }

  if (!data || data.length !== ids.length) {
    return apiError(ApiErrorMessage.ONE_OR_MORE_CENTERS_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  return NextResponse.json({ success: true, deleted_count: data.length });
});
