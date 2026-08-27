import { NextResponse } from "next/server";
import {
  withAuth,
  getPaginationParams,
  validateRequiredFields,
  apiError,
  forbiddenError,
  hasPermission,
  StatusCodes,
  fetchPaginatedResult,
  formatEntityResponse,
  parseBulkIds,
} from "@/db/helpers";
import {
  ProjectSlug,
  PermissionKey,
  EntityKey,
  FilterValue,
  QueryParam,
  TableName,
} from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";

export const GET = withAuth(async (req, user, client) => {
  const pagination = getPaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH);
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN) || EntityKey.CREATED_AT;
  const sortDesc = req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true";
  const commodityIdParam = req.nextUrl.searchParams.get(EntityKey.COMMODITY_ID);
  const unitParam = req.nextUrl.searchParams.get(EntityKey.UNIT);
  const startDateParam = req.nextUrl.searchParams.get(QueryParam.START_DATE);
  const endDateParam = req.nextUrl.searchParams.get(QueryParam.END_DATE);

  let query = client
    .from(TableName.RATES)
    .select(`*, ${TableName.COMMODITIES}!left(${EntityKey.NAME})`, { count: "exact" })
    .order(sortColumn, { ascending: !sortDesc })
    .eq(EntityKey.FACTORY_ID, user.factory_id!)
    .is(EntityKey.DELETED_AT, null);

  if (commodityIdParam && commodityIdParam !== FilterValue.ALL) {
    query = query.eq(EntityKey.COMMODITY_ID, Number(commodityIdParam));
  }
  if (unitParam && unitParam !== FilterValue.ALL) {
    query = query.eq(EntityKey.UNIT, unitParam);
  }
  if (startDateParam) {
    query = query.gte(EntityKey.CREATED_AT, startDateParam);
  }
  if (endDateParam) {
    query = query.lte(EntityKey.CREATED_AT, endDateParam);
  }

  if (search) {
    const searchNum = parseInt(search, 10);
    if (!isNaN(searchNum)) {
      query = query.or(`${EntityKey.UNIT_PRICE}.ilike.%${search}%,${EntityKey.ID}.eq.${searchNum}`);
    } else {
      query = query.ilike(EntityKey.UNIT_PRICE, `%${search}%`);
    }
  }

  return fetchPaginatedResult(query, pagination);
});

export const POST = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.RATES, PermissionKey.CREATE)) return forbiddenError();
  const body = await req.json();
  const err = validateRequiredFields(body, ProjectSlug.RATES);
  if (err) return err;

  const { commodity_id, unit_price, unit } = body;
  const insertValues: Record<string, unknown> = {
    [EntityKey.COMMODITY_ID]: Number(commodity_id),
    [EntityKey.UNIT_PRICE]: String(unit_price),
    [EntityKey.UNIT]: unit,
    [EntityKey.FACTORY_ID]: user.factory_id!,
  };

  const { data: newRate, error } = await client
    .from(TableName.RATES)
    .insert(insertValues)
    .select()
    .single();

  if (error) {
    console.error("POST rate error:", error);
    return apiError(error.message || ApiErrorMessage.CREATE_RATE_FAILED, StatusCodes.BAD_REQUEST);
  }

  return formatEntityResponse(newRate, StatusCodes.CREATED);
});

export const DELETE = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.RATES, PermissionKey.DELETE)) return forbiddenError();
  const ids = parseBulkIds(await req.json());
  if (!ids) return apiError(ApiErrorMessage.PROVIDE_VALID_IDS, StatusCodes.BAD_REQUEST);

  // Check if any active weighments are linked to any of the selected rates
  const { data: linkedWeighments } = await client
    .from(TableName.WEIGHMENTS)
    .select(EntityKey.ID)
    .in(EntityKey.RATE_ID, ids)
    .is(EntityKey.DELETED_AT, null)
    .limit(1);

  if (linkedWeighments && linkedWeighments.length > 0) {
    return apiError(ApiErrorMessage.CANNOT_DELETE_SELECTED_RATES, StatusCodes.BAD_REQUEST);
  }

  const query = client
    .from(TableName.RATES)
    .update({
      [EntityKey.DELETED_AT]: new Date().toISOString(),
      [EntityKey.UPDATED_AT]: new Date().toISOString(),
    })
    .in(EntityKey.ID, ids)
    .is(EntityKey.DELETED_AT, null)
    .eq(EntityKey.FACTORY_ID, user.factory_id!);

  const { data, error } = await query.select(EntityKey.ID);
  if (error) {
    return apiError(
      error.message || ApiErrorMessage.CANNOT_DELETE_SELECTED_RATES,
      StatusCodes.BAD_REQUEST,
    );
  }

  if (!data || data.length !== ids.length) {
    return apiError(ApiErrorMessage.ONE_OR_MORE_RATES_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  return NextResponse.json({ success: true, deleted_count: data.length });
});
