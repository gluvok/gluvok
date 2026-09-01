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
import { ProjectSlug, PermissionKey, Role } from "@/lib/constants/enums";
import { formatWeighmentRecord } from "@/lib/services/weighments";

export const GET = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.WEIGHMENTS, PermissionKey.READ)) return forbiddenError();

  const pagination = getPaginationParams(req.nextUrl);
  const searchParams = req.nextUrl.searchParams;
  const search = searchParams.get("search");
  const sortColumn = searchParams.get("sort_column") || "created_at";
  const sortDesc = searchParams.get("sort_desc") !== "false";
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");
  const typeParam = searchParams.get("type");
  const unitParam = searchParams.get("unit");
  const rateIdParam = searchParams.get("rate_id");

  let query = client
    .from("weighments")
    .select(
      `*, in_entry:entries!in_entry_id(*, centers(name), users(name), customers(name)), out_entry:entries!out_entry_id(*, centers(name), users(name), customers(name))`,
      { count: "exact" },
    )
    .eq("in_entry.factory_id", user.factory_id!)
    .is("deleted_at", null);

  // 1. Direct Root-Table Filters
  if (typeParam && typeParam !== "all") {
    query = query.eq("type", typeParam);
  }
  if (unitParam && unitParam !== "all") {
    query = query.eq("unit", unitParam);
  }
  if (rateIdParam && rateIdParam !== "all") {
    const rateId = Number(rateIdParam);
    if (!isNaN(rateId)) query = query.eq("rate_id", rateId);
  }
  if (startDate) query = query.gte("created_at", startDate);
  if (endDate) query = query.lte("created_at", endDate);

  // 2. Role.BASE Scoping (resolved via entries.customers inner join)
  if (user.role === Role.BASE) {
    const userId = parseInt(user.sub, 10);
    const { data: baseEntries } = await client
      .from("entries")
      .select("id, customers!inner(user_id)")
      .eq("factory_id", user.factory_id!)
      .eq("customers.user_id", userId)
      .is("deleted_at", null);

    const baseEntryIds = (baseEntries || []).map((e: { id: number }) => e.id);

    if (baseEntryIds.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { page: pagination.page, limit: pagination.limit, total: 0 },
      });
    }

    query = query.or(
      `in_entry_id.in.(${baseEntryIds.join(",")}),out_entry_id.in.(${baseEntryIds.join(",")})`,
    );
  }

  // 3. Dual in/out Entry Filters (center_id, user_id, customer_id)
  const dualFilters = ["center_id", "user_id", "customer_id"] as const;
  for (const key of dualFilters) {
    const val = searchParams.get(key);
    if (val && val !== "all") {
      const id = Number(val);
      if (!isNaN(id)) {
        const { data: matchedEntries } = await client
          .from("entries")
          .select("id")
          .eq("factory_id", user.factory_id!)
          .eq(key, id)
          .is("deleted_at", null);

        const matchedIds = (matchedEntries || []).map((e: { id: number }) => e.id);
        if (matchedIds.length === 0) {
          return NextResponse.json({
            data: [],
            pagination: { page: pagination.page, limit: pagination.limit, total: 0 },
          });
        }
        query = query.or(
          `in_entry_id.in.(${matchedIds.join(",")}),out_entry_id.in.(${matchedIds.join(",")})`,
        );
      }
    }
  }

  // 4. Specific in/out Entry Filters (for user and customer)
  const specificFilters: [string, "in_entry_id" | "out_entry_id", string][] = [
    ["in_user_id", "in_entry_id", "user_id"],
    ["in_customer_id", "in_entry_id", "customer_id"],
    ["out_user_id", "out_entry_id", "user_id"],
    ["out_customer_id", "out_entry_id", "customer_id"],
  ];

  for (const [param, targetCol, entryCol] of specificFilters) {
    const val = searchParams.get(param);
    if (val && val !== "all") {
      const id = Number(val);
      if (!isNaN(id)) {
        const { data: matchedEntries } = await client
          .from("entries")
          .select("id")
          .eq("factory_id", user.factory_id!)
          .eq(entryCol, id)
          .is("deleted_at", null);

        const matchedIds = (matchedEntries || []).map((e: { id: number }) => e.id);
        if (matchedIds.length === 0) {
          return NextResponse.json({
            data: [],
            pagination: { page: pagination.page, limit: pagination.limit, total: 0 },
          });
        }
        query = query.in(targetCol, matchedIds);
      }
    }
  }

  // 5. Search
  if (search) {
    const searchNum = parseInt(search, 10);
    const { data: vehicleEntries } = await client
      .from("entries")
      .select("id")
      .eq("factory_id", user.factory_id!)
      .or(`vehicle_number.ilike.%${search}%,detected_vehicle_number.ilike.%${search}%`)
      .is("deleted_at", null);

    const vehicleEntryIds = (vehicleEntries || []).map((e: { id: number }) => e.id);
    const searchClauses: string[] = [];

    if (!isNaN(searchNum)) {
      searchClauses.push(
        `id.eq.${searchNum}`,
        `in_entry_id.eq.${searchNum}`,
        `out_entry_id.eq.${searchNum}`,
      );
    }
    if (vehicleEntryIds.length > 0) {
      searchClauses.push(
        `in_entry_id.in.(${vehicleEntryIds.join(",")})`,
        `out_entry_id.in.(${vehicleEntryIds.join(",")})`,
      );
    }

    if (searchClauses.length > 0) {
      query = query.or(searchClauses.join(","));
    } else {
      return NextResponse.json({
        data: [],
        pagination: { page: pagination.page, limit: pagination.limit, total: 0 },
      });
    }
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

  // 8. Format response rows
  const formattedData = (data || []).map((row: Record<string, unknown>) =>
    formatWeighmentRecord(row),
  );

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
