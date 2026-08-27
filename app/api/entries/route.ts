import { NextResponse } from "next/server";
import {
  withAuth,
  getPaginationParams,
  apiError,
  StatusCodes,
  forbiddenError,
  hasPermission,
} from "@/db/helpers";
import {
  TableName,
  EntityKey,
  QueryParam,
  EntryStatus,
  EntryType,
  FilterValue,
  ProjectSlug,
  PermissionKey,
} from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { validateSequentialApproval, tryMergeEntries } from "@/lib/services/weighments";

export const GET = withAuth(async (req, user, client) => {
  const pagination = getPaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH);
  const statusParam = req.nextUrl.searchParams.get(EntityKey.STATUS);
  const typeParam = req.nextUrl.searchParams.get(EntityKey.TYPE);
  const centerIdParam = req.nextUrl.searchParams.get(EntityKey.CENTER_ID);
  const userIdParam = req.nextUrl.searchParams.get(EntityKey.USER_ID);
  const customerIdParam = req.nextUrl.searchParams.get(EntityKey.CUSTOMER_ID);
  const startDateParam = req.nextUrl.searchParams.get(QueryParam.START_DATE);
  const endDateParam = req.nextUrl.searchParams.get(QueryParam.END_DATE);
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN) || EntityKey.CREATED_AT;
  const sortDesc = req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true";

  let query = client
    .from(TableName.ENTRIES)
    .select(
      `*, ${TableName.CENTERS}(${EntityKey.NAME}), ${TableName.USERS}(${EntityKey.NAME}), ${TableName.CUSTOMERS}(${EntityKey.NAME})`,
      { count: "exact" },
    )
    .eq(EntityKey.FACTORY_ID, user.factory_id!)
    .is(EntityKey.DELETED_AT, null)
    .order(sortColumn, { ascending: !sortDesc });

  if (statusParam && statusParam !== FilterValue.ALL) {
    query = query.eq(EntityKey.STATUS, statusParam);
  }

  if (typeParam && typeParam !== FilterValue.ALL) {
    query = query.eq(EntityKey.TYPE, typeParam);
  }

  if (centerIdParam && centerIdParam !== FilterValue.ALL) {
    query = query.eq(EntityKey.CENTER_ID, Number(centerIdParam));
  }

  if (userIdParam && userIdParam !== FilterValue.ALL) {
    query = query.eq(EntityKey.USER_ID, Number(userIdParam));
  }

  if (customerIdParam && customerIdParam !== FilterValue.ALL) {
    query = query.eq(EntityKey.CUSTOMER_ID, Number(customerIdParam));
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
      query = query.or(
        `${EntityKey.VEHICLE_NUMBER}.ilike.%${search}%,${EntityKey.DETECTED_VEHICLE_NUMBER}.ilike.%${search}%,${EntityKey.ID}.eq.${searchNum}`,
      );
    } else {
      query = query.or(
        `${EntityKey.VEHICLE_NUMBER}.ilike.%${search}%,${EntityKey.DETECTED_VEHICLE_NUMBER}.ilike.%${search}%`,
      );
    }
  }

  const { page, limit, offset } = pagination;
  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) {
    console.error("Supabase query error:", error);
    return apiError(error.message || "Database query failed", StatusCodes.INTERNAL_SERVER_ERROR);
  }

  const formattedData = (data || []).map((row: Record<string, unknown>) => {
    const centers = row.centers as Record<string, unknown> | undefined;
    const users = row.users as Record<string, unknown> | undefined;
    const customers = row.customers as Record<string, unknown> | undefined;

    return {
      ...row,
      [EntityKey.CENTER_NAME]: centers?.name || "",
      [EntityKey.USER_NAME]: users?.name || "",
      [EntityKey.CUSTOMER_NAME]: customers?.name || "",
    };
  });

  const total = count ?? formattedData.length;
  return NextResponse.json({
    data: formattedData,
    pagination: { page, limit, total },
  });
});

export const POST = withAuth(async (req, user, client) => {
  try {
    const body = await req.json();
    const {
      vehicle_number,
      weight,
      center_id,
      customer_id,
      status = EntryStatus.PENDING,
      images = [],
    } = body;

    if (!vehicle_number || weight === undefined || weight === null || weight === "") {
      return apiError("Vehicle number and weight are required.", StatusCodes.BAD_REQUEST);
    }

    if (!center_id) {
      return apiError("Center ID is required.", StatusCodes.BAD_REQUEST);
    }

    // Verify center_id belongs to the user's factory
    const { data: centerRecord } = await client
      .from(TableName.CENTERS)
      .select(EntityKey.ID)
      .eq(EntityKey.ID, Number(center_id))
      .eq(EntityKey.FACTORY_ID, user.factory_id!)
      .maybeSingle();

    if (!centerRecord) {
      return apiError(
        "Invalid center ID or center does not belong to user factory.",
        StatusCodes.FORBIDDEN,
      );
    }

    const userId = user.sub ? parseInt(user.sub, 10) : null;
    if (!userId || isNaN(userId)) {
      return apiError("User ID not found in user session.", StatusCodes.UNAUTHORIZED);
    }

    const nowStr = new Date().toISOString();

    if (status === EntryStatus.APPROVED) {
      await validateSequentialApproval(
        client,
        user.factory_id!,
        vehicle_number,
        nowStr,
        0,
        EntryType.MANUAL,
      );
    }

    const { data: newEntry, error: insertErr } = await client
      .from(TableName.ENTRIES)
      .insert({
        [EntityKey.DETECTED_VEHICLE_NUMBER]: null,
        [EntityKey.VEHICLE_NUMBER]: vehicle_number,
        [EntityKey.WEIGHT]: Number(weight),
        [EntityKey.TYPE]: EntryType.MANUAL,
        [EntityKey.CENTER_ID]: Number(center_id),
        [EntityKey.USER_ID]: userId,
        [EntityKey.CUSTOMER_ID]: customer_id ? Number(customer_id) : null,
        [EntityKey.FACTORY_ID]: user.factory_id!,
        [EntityKey.STATUS]: status,
        [EntityKey.IMAGES]: images,
        [EntityKey.CREATED_AT]: nowStr,
        [EntityKey.UPDATED_AT]: nowStr,
      })
      .select("*")
      .single();

    if (insertErr || !newEntry) {
      console.error("Failed to insert manual entry:", insertErr);
      return apiError("Failed to create entry.", StatusCodes.INTERNAL_SERVER_ERROR);
    }

    if (status === EntryStatus.APPROVED) {
      await tryMergeEntries(client, user.factory_id!, newEntry.id);
    }

    return NextResponse.json({ data: newEntry }, { status: StatusCodes.CREATED });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to process entry creation.";
    return apiError(msg, StatusCodes.BAD_REQUEST);
  }
});

export const DELETE = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.ENTRIES, PermissionKey.DELETE)) return forbiddenError();

  let body;
  try {
    body = await req.json();
  } catch {
    return apiError(ApiErrorMessage.PROVIDE_VALID_IDS, StatusCodes.BAD_REQUEST);
  }

  const { ids } = body;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
    return apiError(ApiErrorMessage.PROVIDE_VALID_IDS, StatusCodes.BAD_REQUEST);
  }

  // Check if any active weighments are linked to these entries
  const { data: linkedWeighments } = await client
    .from(TableName.WEIGHMENTS)
    .select(EntityKey.ID)
    .or(`in_entry_id.in.(${ids.join(",")}),out_entry_id.in.(${ids.join(",")})`)
    .is(EntityKey.DELETED_AT, null)
    .limit(1);

  if (linkedWeighments && linkedWeighments.length > 0) {
    return apiError(ApiErrorMessage.CANNOT_DELETE_SELECTED_ENTRIES, StatusCodes.BAD_REQUEST);
  }

  const { data: deletedEntries, error } = await client
    .from(TableName.ENTRIES)
    .update({
      [EntityKey.DELETED_AT]: new Date().toISOString(),
      [EntityKey.UPDATED_AT]: new Date().toISOString(),
    })
    .in(EntityKey.ID, ids)
    .is(EntityKey.DELETED_AT, null)
    .eq(EntityKey.FACTORY_ID, user.factory_id!)
    .select(EntityKey.ID);

  if (error) {
    return apiError(
      error.message || ApiErrorMessage.CANNOT_DELETE_SELECTED_ENTRIES,
      StatusCodes.BAD_REQUEST,
    );
  }

  const deletedCount = deletedEntries?.length || 0;
  if (deletedCount !== ids.length) {
    return apiError(ApiErrorMessage.ONE_OR_MORE_ENTRIES_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  return NextResponse.json({ success: true, deleted_count: deletedCount });
});
