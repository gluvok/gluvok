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
  const typeParam = req.nextUrl.searchParams.get("type");
  const unitParam = req.nextUrl.searchParams.get("unit");
  const rateIdParam = req.nextUrl.searchParams.get("rate_id");
  const centerIdParam = req.nextUrl.searchParams.get("center_id");
  const userIdParam = req.nextUrl.searchParams.get("user_id");
  const customerIdParam = req.nextUrl.searchParams.get("customer_id");
  const inCenterIdParam = req.nextUrl.searchParams.get("in_center_id");
  const outCenterIdParam = req.nextUrl.searchParams.get("out_center_id");
  const inUserIdParam = req.nextUrl.searchParams.get("in_user_id");
  const outUserIdParam = req.nextUrl.searchParams.get("out_user_id");
  const inCustomerIdParam = req.nextUrl.searchParams.get("in_customer_id");
  const outCustomerIdParam = req.nextUrl.searchParams.get("out_customer_id");
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN) || "created_at";
  const sortDesc = req.nextUrl.searchParams.has(QueryParam.SORT_DESC)
    ? req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true"
    : true;
  const startDateParam = req.nextUrl.searchParams.get(QueryParam.START_DATE);
  const endDateParam = req.nextUrl.searchParams.get(QueryParam.END_DATE);

  // Query weighments joined with in_entry and out_entry and their related centers, users, customers
  let query = client
    .from(TableName.WEIGHMENTS)
    .select(
      `*, ${RelationAlias.IN_ENTRY}:${TableName.ENTRIES}!in_entry_id(*, ${TableName.CENTERS}(name), ${TableName.USERS}(name), ${TableName.CUSTOMERS}(name)), ${RelationAlias.OUT_ENTRY}:${TableName.ENTRIES}!out_entry_id(*, ${TableName.CENTERS}(name), ${TableName.USERS}(name), ${TableName.CUSTOMERS}(name))`,
      { count: "exact" },
    )
    .eq(`${RelationAlias.IN_ENTRY}.factory_id`, user.factory_id!)
    .is("deleted_at", null);

  if (typeParam && typeParam !== FilterValue.ALL) {
    query = query.eq("type", typeParam);
  }

  if (unitParam && unitParam !== FilterValue.ALL) {
    query = query.eq("unit", unitParam);
  }

  if (rateIdParam && rateIdParam !== FilterValue.ALL) {
    query = query.eq("rate_id", Number(rateIdParam));
  }

  if (centerIdParam && centerIdParam !== FilterValue.ALL) {
    const cId = Number(centerIdParam);
    query = query.or(
      `${RelationAlias.IN_ENTRY}.center_id.eq.${cId},${RelationAlias.OUT_ENTRY}.center_id.eq.${cId}`,
    );
  }

  if (userIdParam && userIdParam !== FilterValue.ALL) {
    const uId = Number(userIdParam);
    query = query.or(
      `${RelationAlias.IN_ENTRY}.user_id.eq.${uId},${RelationAlias.OUT_ENTRY}.user_id.eq.${uId}`,
    );
  }

  if (customerIdParam && customerIdParam !== FilterValue.ALL) {
    const custId = Number(customerIdParam);
    query = query.or(
      `${RelationAlias.IN_ENTRY}.customer_id.eq.${custId},${RelationAlias.OUT_ENTRY}.customer_id.eq.${custId}`,
    );
  }

  if (inCenterIdParam && inCenterIdParam !== FilterValue.ALL) {
    query = query.eq(`${RelationAlias.IN_ENTRY}.center_id`, Number(inCenterIdParam));
  }

  if (outCenterIdParam && outCenterIdParam !== FilterValue.ALL) {
    query = query.eq(`${RelationAlias.OUT_ENTRY}.center_id`, Number(outCenterIdParam));
  }

  if (inUserIdParam && inUserIdParam !== FilterValue.ALL) {
    query = query.eq(`${RelationAlias.IN_ENTRY}.user_id`, Number(inUserIdParam));
  }

  if (outUserIdParam && outUserIdParam !== FilterValue.ALL) {
    query = query.eq(`${RelationAlias.OUT_ENTRY}.user_id`, Number(outUserIdParam));
  }

  if (inCustomerIdParam && inCustomerIdParam !== FilterValue.ALL) {
    query = query.eq(`${RelationAlias.IN_ENTRY}.customer_id`, Number(inCustomerIdParam));
  }

  if (outCustomerIdParam && outCustomerIdParam !== FilterValue.ALL) {
    query = query.eq(`${RelationAlias.OUT_ENTRY}.customer_id`, Number(outCustomerIdParam));
  }

  if (startDateParam) {
    query = query.gte("created_at", startDateParam);
  }

  if (endDateParam) {
    query = query.lte("created_at", endDateParam);
  }

  if (search) {
    const searchNum = parseInt(search, 10);
    if (!isNaN(searchNum)) {
      query = query.or(
        `in_entry_id.eq.${searchNum},out_entry_id.eq.${searchNum},${RelationAlias.IN_ENTRY}.vehicle_number.ilike.%${search}%`,
      );
    } else {
      query = query.or(`${RelationAlias.IN_ENTRY}.vehicle_number.ilike.%${search}%`);
    }
  }

  // Non-deprecated PostgreSQL ordering (including Computed Columns: gross_weight, tare_weight, net_weight)
  if (
    sortColumn === "created_at" ||
    sortColumn === "id" ||
    sortColumn === "unit" ||
    sortColumn === "in_entry_id" ||
    sortColumn === "out_entry_id" ||
    sortColumn === "gross_weight" ||
    sortColumn === "tare_weight" ||
    sortColumn === "net_weight"
  ) {
    query = query.order(sortColumn, { ascending: !sortDesc });
  } else if (sortColumn === "in_entry_created_at") {
    query = query.order(`${RelationAlias.IN_ENTRY}.created_at`, {
      ascending: !sortDesc,
    });
  } else if (sortColumn === "out_entry_created_at") {
    query = query.order(`${RelationAlias.OUT_ENTRY}.created_at`, {
      ascending: !sortDesc,
    });
  } else {
    query = query.order("created_at", { ascending: false });
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
      id: row.id,
      unit: row.unit || Unit.KG,
      type: row.type || WeighmentType.UNASSIGNED,
      gross_weight: grossWeight,
      tare_weight: tareWeight,
      net_weight: netWeight,
      images: combinedImages,
      in_entry_id: row.in_entry_id,
      in_entry_created_at: inEntry.created_at,
      out_entry_id: row.out_entry_id,
      out_entry_created_at: outEntry.created_at,
      in_center_id: inEntry.center_id,
      in_center_name: inCenters?.name || "",
      out_center_id: outEntry.center_id,
      out_center_name: outCenters?.name || "",
      in_user_id: inEntry.user_id,
      in_user_name: inUsers?.name || "",
      out_user_id: outEntry.user_id,
      out_user_name: outUsers?.name || "",
      in_customer_id: inEntry.customer_id,
      in_customer_name: inCustomers?.name || "",
      out_customer_id: outEntry.customer_id,
      out_customer_name: outCustomers?.name || "",
      vehicle_number: inEntry.vehicle_number || outEntry.vehicle_number || "",
      created_at: row.created_at,
      updated_at: row.updated_at,
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
    .select(`*, ${RelationAlias.IN_ENTRY}:${TableName.ENTRIES}!in_entry_id(factory_id)`)
    .in("id", ids)
    .is("deleted_at", null);

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
      deleted_at: now,
      updated_at: now,
    })
    .in("id", validIds)
    .is("deleted_at", null);

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
        deleted_at: now,
        updated_at: now,
      })
      .in("id", uniqueEntryIds)
      .eq("factory_id", user.factory_id)
      .is("deleted_at", null);

    if (cascadeErr) {
      console.error("Failed to cascade soft delete to entries:", cascadeErr);
    }
  }

  return NextResponse.json({ success: true, deleted_count: validIds.length });
});
