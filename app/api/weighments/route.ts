import { NextResponse } from "next/server";
import {
  withAuth,
  getPaginationParams,
  apiError,
  StatusCodes,
  forbiddenError,
  hasPermission,
  parseBulkIds,
} from "@/db/helpers";
import {
  QueryParam,
  EntityKey,
  TableName,
  RelationAlias,
  FilterValue,
  WeighmentType,
  Unit,
  ProjectSlug,
  PermissionKey,
} from "@/lib/constants/enums";

export const GET = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.WEIGHMENTS, PermissionKey.READ)) return forbiddenError();
  const pagination = getPaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH);
  const typeParam = req.nextUrl.searchParams.get(EntityKey.TYPE);
  const unitParam = req.nextUrl.searchParams.get(EntityKey.UNIT);
  const rateIdParam = req.nextUrl.searchParams.get(EntityKey.RATE_ID);
  const centerIdParam = req.nextUrl.searchParams.get(EntityKey.CENTER_ID);
  const userIdParam = req.nextUrl.searchParams.get(EntityKey.USER_ID);
  const customerIdParam = req.nextUrl.searchParams.get(EntityKey.CUSTOMER_ID);
  const inCenterIdParam = req.nextUrl.searchParams.get(EntityKey.IN_CENTER_ID);
  const outCenterIdParam = req.nextUrl.searchParams.get(EntityKey.OUT_CENTER_ID);
  const inUserIdParam = req.nextUrl.searchParams.get(EntityKey.IN_USER_ID);
  const outUserIdParam = req.nextUrl.searchParams.get(EntityKey.OUT_USER_ID);
  const inCustomerIdParam = req.nextUrl.searchParams.get(EntityKey.IN_CUSTOMER_ID);
  const outCustomerIdParam = req.nextUrl.searchParams.get(EntityKey.OUT_CUSTOMER_ID);
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN) || EntityKey.CREATED_AT;
  const sortDesc = req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true";
  const startDateParam = req.nextUrl.searchParams.get(QueryParam.START_DATE);
  const endDateParam = req.nextUrl.searchParams.get(QueryParam.END_DATE);

  // Query weighments joined with in_entry and out_entry and their related centers, users, customers
  let query = client
    .from(TableName.WEIGHMENTS)
    .select(
      `*, ${RelationAlias.IN_ENTRY}:${TableName.ENTRIES}!in_entry_id(*, ${TableName.CENTERS}(${EntityKey.NAME}), ${TableName.USERS}(${EntityKey.NAME}), ${TableName.CUSTOMERS}(${EntityKey.NAME})), ${RelationAlias.OUT_ENTRY}:${TableName.ENTRIES}!out_entry_id(*, ${TableName.CENTERS}(${EntityKey.NAME}), ${TableName.USERS}(${EntityKey.NAME}), ${TableName.CUSTOMERS}(${EntityKey.NAME}))`,
      { count: "exact" },
    )
    .eq(`${RelationAlias.IN_ENTRY}.${EntityKey.FACTORY_ID}`, user.factory_id!)
    .is(EntityKey.DELETED_AT, null);

  if (typeParam && typeParam !== FilterValue.ALL) {
    query = query.eq(EntityKey.TYPE, typeParam);
  }

  if (unitParam && unitParam !== FilterValue.ALL) {
    query = query.eq(EntityKey.UNIT, unitParam);
  }

  if (rateIdParam && rateIdParam !== FilterValue.ALL) {
    query = query.eq(EntityKey.RATE_ID, Number(rateIdParam));
  }

  if (centerIdParam && centerIdParam !== FilterValue.ALL) {
    const cId = Number(centerIdParam);
    query = query.or(
      `${RelationAlias.IN_ENTRY}.${EntityKey.CENTER_ID}.eq.${cId},${RelationAlias.OUT_ENTRY}.${EntityKey.CENTER_ID}.eq.${cId}`,
    );
  }

  if (userIdParam && userIdParam !== FilterValue.ALL) {
    const uId = Number(userIdParam);
    query = query.or(
      `${RelationAlias.IN_ENTRY}.${EntityKey.USER_ID}.eq.${uId},${RelationAlias.OUT_ENTRY}.${EntityKey.USER_ID}.eq.${uId}`,
    );
  }

  if (customerIdParam && customerIdParam !== FilterValue.ALL) {
    const custId = Number(customerIdParam);
    query = query.or(
      `${RelationAlias.IN_ENTRY}.${EntityKey.CUSTOMER_ID}.eq.${custId},${RelationAlias.OUT_ENTRY}.${EntityKey.CUSTOMER_ID}.eq.${custId}`,
    );
  }

  if (inCenterIdParam && inCenterIdParam !== FilterValue.ALL) {
    query = query.eq(`${RelationAlias.IN_ENTRY}.${EntityKey.CENTER_ID}`, Number(inCenterIdParam));
  }

  if (outCenterIdParam && outCenterIdParam !== FilterValue.ALL) {
    query = query.eq(`${RelationAlias.OUT_ENTRY}.${EntityKey.CENTER_ID}`, Number(outCenterIdParam));
  }

  if (inUserIdParam && inUserIdParam !== FilterValue.ALL) {
    query = query.eq(`${RelationAlias.IN_ENTRY}.${EntityKey.USER_ID}`, Number(inUserIdParam));
  }

  if (outUserIdParam && outUserIdParam !== FilterValue.ALL) {
    query = query.eq(`${RelationAlias.OUT_ENTRY}.${EntityKey.USER_ID}`, Number(outUserIdParam));
  }

  if (inCustomerIdParam && inCustomerIdParam !== FilterValue.ALL) {
    query = query.eq(
      `${RelationAlias.IN_ENTRY}.${EntityKey.CUSTOMER_ID}`,
      Number(inCustomerIdParam),
    );
  }

  if (outCustomerIdParam && outCustomerIdParam !== FilterValue.ALL) {
    query = query.eq(
      `${RelationAlias.OUT_ENTRY}.${EntityKey.CUSTOMER_ID}`,
      Number(outCustomerIdParam),
    );
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
        `${EntityKey.IN_ENTRY_ID}.eq.${searchNum},${EntityKey.OUT_ENTRY_ID}.eq.${searchNum},${RelationAlias.IN_ENTRY}.${EntityKey.VEHICLE_NUMBER}.ilike.%${search}%`,
      );
    } else {
      query = query.or(`${RelationAlias.IN_ENTRY}.${EntityKey.VEHICLE_NUMBER}.ilike.%${search}%`);
    }
  }

  // Non-deprecated PostgreSQL ordering (including Computed Columns: gross_weight, tare_weight, net_weight)
  if (
    sortColumn === EntityKey.CREATED_AT ||
    sortColumn === EntityKey.ID ||
    sortColumn === EntityKey.UNIT ||
    sortColumn === EntityKey.IN_ENTRY_ID ||
    sortColumn === EntityKey.OUT_ENTRY_ID ||
    sortColumn === EntityKey.GROSS_WEIGHT ||
    sortColumn === EntityKey.TARE_WEIGHT ||
    sortColumn === EntityKey.NET_WEIGHT
  ) {
    query = query.order(sortColumn, { ascending: !sortDesc });
  } else if (sortColumn === EntityKey.IN_ENTRY_CREATED_AT) {
    query = query.order(`${RelationAlias.IN_ENTRY}.${EntityKey.CREATED_AT}`, {
      ascending: !sortDesc,
    });
  } else if (sortColumn === EntityKey.OUT_ENTRY_CREATED_AT) {
    query = query.order(`${RelationAlias.OUT_ENTRY}.${EntityKey.CREATED_AT}`, {
      ascending: !sortDesc,
    });
  } else {
    query = query.order(EntityKey.CREATED_AT, { ascending: false });
  }

  const { page, limit, offset } = pagination;
  const { data, count, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error("Supabase query error:", error);
    return apiError(error.message || "Database query failed", StatusCodes.INTERNAL_SERVER_ERROR);
  }

  // Format response rows with computed derived fields
  const formattedData = (data || []).map((row: Record<string, unknown>) => {
    const inEntry = (row[RelationAlias.IN_ENTRY] as Record<string, unknown>) || {};
    const outEntry = (row[RelationAlias.OUT_ENTRY] as Record<string, unknown>) || {};

    const inWeight = Number(inEntry.weight || 0);
    const outWeight = Number(outEntry.weight || 0);

    const grossWeight = Math.max(inWeight, outWeight);
    const tareWeight = Math.min(inWeight, outWeight);
    const netWeight = grossWeight - tareWeight;

    const inImages = Array.isArray(inEntry.images) ? (inEntry.images as string[]) : [];
    const outImages = Array.isArray(outEntry.images) ? (outEntry.images as string[]) : [];
    const combinedImages = Array.from(new Set([...inImages, ...outImages]));

    const inCenters = inEntry.centers as Record<string, unknown> | undefined;
    const outCenters = outEntry.centers as Record<string, unknown> | undefined;
    const inUsers = inEntry.users as Record<string, unknown> | undefined;
    const outUsers = outEntry.users as Record<string, unknown> | undefined;
    const inCustomers = inEntry.customers as Record<string, unknown> | undefined;
    const outCustomers = outEntry.customers as Record<string, unknown> | undefined;

    return {
      [EntityKey.ID]: row.id,
      [EntityKey.UNIT]: row.unit || Unit.KG,
      [EntityKey.TYPE]: row.type || WeighmentType.UNASSIGNED,
      [EntityKey.GROSS_WEIGHT]: grossWeight,
      [EntityKey.TARE_WEIGHT]: tareWeight,
      [EntityKey.NET_WEIGHT]: netWeight,
      [EntityKey.IMAGES]: combinedImages,
      [EntityKey.IN_ENTRY_ID]: row.in_entry_id,
      [EntityKey.IN_ENTRY_CREATED_AT]: inEntry.created_at,
      [EntityKey.OUT_ENTRY_ID]: row.out_entry_id,
      [EntityKey.OUT_ENTRY_CREATED_AT]: outEntry.created_at,
      [EntityKey.IN_CENTER_ID]: inEntry.center_id,
      [EntityKey.IN_CENTER_NAME]: inCenters?.name || "",
      [EntityKey.OUT_CENTER_ID]: outEntry.center_id,
      [EntityKey.OUT_CENTER_NAME]: outCenters?.name || "",
      [EntityKey.IN_USER_ID]: inEntry.user_id,
      [EntityKey.IN_USER_NAME]: inUsers?.name || "",
      [EntityKey.OUT_USER_ID]: outEntry.user_id,
      [EntityKey.OUT_USER_NAME]: outUsers?.name || "",
      [EntityKey.IN_CUSTOMER_ID]: inEntry.customer_id,
      [EntityKey.IN_CUSTOMER_NAME]: inCustomers?.name || "",
      [EntityKey.OUT_CUSTOMER_ID]: outEntry.customer_id,
      [EntityKey.OUT_CUSTOMER_NAME]: outCustomers?.name || "",
      [EntityKey.VEHICLE_NUMBER]: inEntry.vehicle_number || outEntry.vehicle_number || "",
      [EntityKey.CREATED_AT]: row.created_at,
      [EntityKey.UPDATED_AT]: row.updated_at,
    };
  });

  const total = count ?? formattedData.length;
  return NextResponse.json({
    data: formattedData,
    pagination: { page, limit, total },
  });
});

export const DELETE = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.WEIGHMENTS, PermissionKey.DELETE)) return forbiddenError();

  let body;
  try {
    body = await req.json();
  } catch {
    return apiError("Please provide valid IDs to delete.", StatusCodes.BAD_REQUEST);
  }

  const ids = parseBulkIds(body);
  if (!ids || ids.length === 0) {
    return apiError("Please provide valid IDs to delete.", StatusCodes.BAD_REQUEST);
  }

  // 1. Query target weighments with factory verification
  const { data: weighments, error: fetchErr } = await client
    .from(TableName.WEIGHMENTS)
    .select(
      `*, ${RelationAlias.IN_ENTRY}:${TableName.ENTRIES}!in_entry_id(${EntityKey.FACTORY_ID})`,
    )
    .in(EntityKey.ID, ids)
    .is(EntityKey.DELETED_AT, null);

  if (fetchErr) {
    console.error("Failed to fetch weighments for deletion:", fetchErr);
    return apiError("Failed to delete weighments", StatusCodes.INTERNAL_SERVER_ERROR);
  }

  const validWeighments = (weighments || []).filter((w: Record<string, unknown>) => {
    const inEntry = w[RelationAlias.IN_ENTRY] as Record<string, unknown> | undefined;
    return inEntry?.factory_id === user.factory_id!;
  });

  if (validWeighments.length === 0) {
    return apiError("One or more weighments not found", StatusCodes.NOT_FOUND);
  }

  const now = new Date().toISOString();
  const validIds = validWeighments.map((w: Record<string, unknown>) => w.id as number);

  // 2. Soft delete weighment records
  const { error: deleteErr } = await client
    .from(TableName.WEIGHMENTS)
    .update({
      [EntityKey.DELETED_AT]: now,
      [EntityKey.UPDATED_AT]: now,
    })
    .in(EntityKey.ID, validIds)
    .is(EntityKey.DELETED_AT, null);

  if (deleteErr) {
    console.error("Failed to soft delete weighments:", deleteErr);
    return apiError("Failed to delete weighments", StatusCodes.INTERNAL_SERVER_ERROR);
  }

  // 3. Cascade soft delete to all linked in/out entries
  const linkedEntryIds = validWeighments
    .flatMap((w: Record<string, unknown>) => [w.in_entry_id as number, w.out_entry_id as number])
    .filter(
      (id: number | null | undefined): id is number =>
        id !== null && id !== undefined && Number(id) > 0,
    );

  const uniqueEntryIds = [...new Set(linkedEntryIds)];
  if (uniqueEntryIds.length > 0) {
    const { error: cascadeErr } = await client
      .from(TableName.ENTRIES)
      .update({
        [EntityKey.DELETED_AT]: now,
        [EntityKey.UPDATED_AT]: now,
      })
      .in(EntityKey.ID, uniqueEntryIds)
      .eq(EntityKey.FACTORY_ID, user.factory_id!)
      .is(EntityKey.DELETED_AT, null);

    if (cascadeErr) {
      console.error("Failed to cascade soft delete to entries:", cascadeErr);
    }
  }

  return NextResponse.json({ success: true, deleted_count: validIds.length });
});
