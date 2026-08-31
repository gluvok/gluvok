import { NextResponse } from "next/server";
import {
  withAuth,
  getPaginationParams,
  apiError,
  StatusCodes,
  forbiddenError,
  hasPermission,
  parseBulkIds,
  getBaseUserCustomerIds,
} from "@/db/helpers";
import { WeighmentType, Unit, ProjectSlug, PermissionKey, Role } from "@/lib/constants/enums";

const DIRECT_FILTERS: Record<string, string> = {
  type: "type",
  unit: "unit",
  rate_id: "rate_id",
  in_center_id: "in_entry.center_id",
  out_center_id: "out_entry.center_id",
  in_user_id: "in_entry.user_id",
  out_user_id: "out_entry.user_id",
  in_customer_id: "in_entry.customer_id",
  out_customer_id: "out_entry.customer_id",
};

const DUAL_ENTRY_FILTERS = ["center_id", "user_id", "customer_id"] as const;

export const GET = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.WEIGHMENTS, PermissionKey.READ)) return forbiddenError();

  const pagination = getPaginationParams(req.nextUrl);
  const searchParams = req.nextUrl.searchParams;
  const search = searchParams.get("search");
  const sortColumn = searchParams.get("sort_column") || "created_at";
  const sortDesc = searchParams.get("sort_desc") !== "false";
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  let query = client
    .from("weighments")
    .select(
      `*, in_entry:entries!in_entry_id(*, centers(name), users(name), customers(name)), out_entry:entries!out_entry_id(*, centers(name), users(name), customers(name))`,
      { count: "exact" },
    )
    .eq("in_entry.factory_id", user.factory_id!)
    .is("deleted_at", null);

  // 1. Role.BASE scoping
  if (user.role === Role.BASE) {
    const userId = parseInt(user.sub, 10);
    const customerIds = await getBaseUserCustomerIds(client, userId);
    const orClauses = [
      `in_entry.user_id.eq.${userId}`,
      `out_entry.user_id.eq.${userId}`,
      ...(customerIds.length > 0
        ? [
            `in_entry.customer_id.in.(${customerIds.join(",")})`,
            `out_entry.customer_id.in.(${customerIds.join(",")})`,
          ]
        : []),
    ];
    query = query.or(orClauses.join(","));
  }

  // 2. Direct Column Filters (direct table column or nested entry column)
  for (const [param, col] of Object.entries(DIRECT_FILTERS)) {
    const val = searchParams.get(param);
    if (val && val !== "all") {
      const num = Number(val);
      query = query.eq(col, isNaN(num) ? val : num);
    }
  }

  // 3. Dual in/out Entry Filters (matches either in_entry or out_entry)
  for (const key of DUAL_ENTRY_FILTERS) {
    const val = searchParams.get(key);
    if (val && val !== "all") {
      const id = Number(val);
      if (!isNaN(id)) {
        query = query.or(`in_entry.${key}.eq.${id},out_entry.${key}.eq.${id}`);
      }
    }
  }

  // 4. Date range filters
  if (startDate) query = query.gte("created_at", startDate);
  if (endDate) query = query.lte("created_at", endDate);

  // 5. Search
  if (search) {
    const searchNum = parseInt(search, 10);
    query = !isNaN(searchNum)
      ? query.or(
          `in_entry_id.eq.${searchNum},out_entry_id.eq.${searchNum},in_entry.vehicle_number.ilike.%${search}%`,
        )
      : query.or(`in_entry.vehicle_number.ilike.%${search}%`);
  }

  // 6. Sorting
  const entrySortPrefix = sortColumn.startsWith("in_entry_")
    ? "in_entry."
    : sortColumn.startsWith("out_entry_")
      ? "out_entry."
      : "";

  const effectiveSortColumn = entrySortPrefix
    ? `${entrySortPrefix}${sortColumn.replace(/^(in|out)_entry_/, "")}`
    : sortColumn;

  query = query.order(effectiveSortColumn, { ascending: !sortDesc });

  // 7. Pagination & Execution
  const { page, limit, offset } = pagination;
  const { data, count, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error("Supabase query error:", error);
    return apiError(error.message || "Database query failed", StatusCodes.INTERNAL_SERVER_ERROR);
  }

  // 8. Format response rows with computed derived fields
  const formattedData = (data || []).map((row: Record<string, unknown>) => {
    const inEntry = (row["in_entry"] as Record<string, unknown>) || {};
    const outEntry = (row["out_entry"] as Record<string, unknown>) || {};

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

  const ids = parseBulkIds(await req.json().catch(() => null));
  if (!ids) {
    return apiError("Please provide valid IDs to delete.", StatusCodes.BAD_REQUEST);
  }

  // 1. Query target weighments with factory verification
  const { data: weighments, error: fetchErr } = await client
    .from("weighments")
    .select(`id, in_entry_id, out_entry_id, in_entry:entries!in_entry_id(factory_id)`)
    .in("id", ids)
    .is("deleted_at", null);

  if (fetchErr) {
    console.error("Failed to fetch weighments for deletion:", fetchErr);
    return apiError("Failed to delete weighments", StatusCodes.INTERNAL_SERVER_ERROR);
  }

  const validWeighments = (weighments || []).filter(
    (w: Record<string, unknown>) =>
      (w["in_entry"] as { factory_id?: number } | undefined)?.factory_id === user.factory_id,
  );

  if (validWeighments.length === 0) {
    return apiError("One or more weighments not found", StatusCodes.NOT_FOUND);
  }

  const now = new Date().toISOString();
  const validIds = validWeighments.map((w) => w.id as number);

  // 2. Soft delete weighment records
  const { error: deleteErr } = await client
    .from("weighments")
    .update({ deleted_at: now, updated_at: now })
    .in("id", validIds)
    .is("deleted_at", null);

  if (deleteErr) {
    console.error("Failed to soft delete weighments:", deleteErr);
    return apiError("Failed to delete weighments", StatusCodes.INTERNAL_SERVER_ERROR);
  }

  // 3. Cascade soft delete to all linked in/out entries
  const linkedEntryIds = [
    ...new Set(
      validWeighments
        .flatMap((w) => [w.in_entry_id as number, w.out_entry_id as number])
        .filter((id): id is number => typeof id === "number" && id > 0),
    ),
  ];

  if (linkedEntryIds.length > 0) {
    const { error: cascadeErr } = await client
      .from("entries")
      .update({ deleted_at: now, updated_at: now })
      .in("id", linkedEntryIds)
      .eq("factory_id", user.factory_id)
      .is("deleted_at", null);

    if (cascadeErr) {
      console.error("Failed to cascade soft delete to entries:", cascadeErr);
    }
  }

  return NextResponse.json({ success: true, deleted_count: validIds.length });
});
