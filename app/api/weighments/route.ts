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
import { formatWeighmentRecord, deleteWeighments } from "@/lib/services/weighments";

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

  const dualFilters = ["center_id", "user_id", "customer_id"] as const;
  const specificFilters: [string, "in_entry_id" | "out_entry_id", string][] = [
    ["in_user_id", "in_entry_id", "user_id"],
    ["in_customer_id", "in_entry_id", "customer_id"],
    ["out_user_id", "out_entry_id", "user_id"],
    ["out_customer_id", "out_entry_id", "customer_id"],
  ];

  // 1. Parallel Pre-Queries for Linked Entry Filters & Search
  type DualFilterResult = { type: "dual"; ids: number[] };
  type SpecificFilterResult = { type: "specific"; targetCol: "in_entry_id" | "out_entry_id"; ids: number[] };
  type SearchFilterResult = { type: "search"; searchNum: number; ids: number[] };
  type BaseScopeResult = { type: "base"; ids: number[] };

  const preQueryPromises: Promise<DualFilterResult | SpecificFilterResult | SearchFilterResult | BaseScopeResult>[] = [];

  if (user.role === Role.BASE) {
    const userId = parseInt(user.sub, 10);
    preQueryPromises.push(
      (async (): Promise<BaseScopeResult> => {
        const { data } = await client
          .from("entries")
          .select("id, customers!inner(user_id)")
          .eq("factory_id", user.factory_id!)
          .eq("customers.user_id", userId)
          .is("deleted_at", null);
        return {
          type: "base",
          ids: (data || []).map((e: { id: number }) => e.id),
        };
      })(),
    );
  }

  for (const key of dualFilters) {
    const val = searchParams.get(key);
    if (val && val !== "all") {
      const id = Number(val);
      if (!isNaN(id)) {
        preQueryPromises.push(
          (async (): Promise<DualFilterResult> => {
            const { data } = await client
              .from("entries")
              .select("id")
              .eq("factory_id", user.factory_id!)
              .eq(key, id)
              .is("deleted_at", null);
            return {
              type: "dual",
              ids: (data || []).map((e: { id: number }) => e.id),
            };
          })(),
        );
      }
    }
  }

  for (const [param, targetCol, entryCol] of specificFilters) {
    const val = searchParams.get(param);
    if (val && val !== "all") {
      const id = Number(val);
      if (!isNaN(id)) {
        preQueryPromises.push(
          (async (): Promise<SpecificFilterResult> => {
            const { data } = await client
              .from("entries")
              .select("id")
              .eq("factory_id", user.factory_id!)
              .eq(entryCol, id)
              .is("deleted_at", null);
            return {
              type: "specific",
              targetCol,
              ids: (data || []).map((e: { id: number }) => e.id),
            };
          })(),
        );
      }
    }
  }

  if (search) {
    const searchNum = parseInt(search, 10);
    preQueryPromises.push(
      (async (): Promise<SearchFilterResult> => {
        const { data } = await client
          .from("entries")
          .select("id")
          .eq("factory_id", user.factory_id!)
          .or(`vehicle_number.ilike.%${search}%,detected_vehicle_number.ilike.%${search}%`)
          .is("deleted_at", null);
        return {
          type: "search",
          searchNum,
          ids: (data || []).map((e: { id: number }) => e.id),
        };
      })(),
    );
  }

  const preQueryResults = await Promise.all(preQueryPromises);

  // 2. Build Root Query with Optimized Column Projections
  let query = client
    .from("weighments")
    .select(
      `*, in_entry:entries!in_entry_id(id, weight, images, created_at, center_id, user_id, customer_id, vehicle_number, centers(name), users(name), customers(name)), out_entry:entries!out_entry_id(id, weight, images, created_at, center_id, user_id, customer_id, vehicle_number, centers(name), users(name), customers(name))`,
      { count: "exact" },
    )
    .eq("in_entry.factory_id", user.factory_id!)
    .is("deleted_at", null);

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

  // 3. Apply Resolved Pre-query Results
  for (const res of preQueryResults) {
    if (res.type === "base") {
      if (res.ids.length === 0) {
        return NextResponse.json({
          data: [],
          pagination: { page: pagination.page, limit: pagination.limit, total: 0 },
        });
      }
      query = query.or(`in_entry_id.in.(${res.ids.join(",")}),out_entry_id.in.(${res.ids.join(",")})`);
    } else if (res.type === "dual") {
      if (res.ids.length === 0) {
        return NextResponse.json({
          data: [],
          pagination: { page: pagination.page, limit: pagination.limit, total: 0 },
        });
      }
      query = query.or(`in_entry_id.in.(${res.ids.join(",")}),out_entry_id.in.(${res.ids.join(",")})`);
    } else if (res.type === "specific") {
      if (res.ids.length === 0) {
        return NextResponse.json({
          data: [],
          pagination: { page: pagination.page, limit: pagination.limit, total: 0 },
        });
      }
      query = query.in(res.targetCol, res.ids);
    } else if (res.type === "search") {
      const searchClauses: string[] = [];
      if (!isNaN(res.searchNum)) {
        searchClauses.push(
          `id.eq.${res.searchNum}`,
          `in_entry_id.eq.${res.searchNum}`,
          `out_entry_id.eq.${res.searchNum}`,
        );
      }
      if (res.ids.length > 0) {
        searchClauses.push(
          `in_entry_id.in.(${res.ids.join(",")})`,
          `out_entry_id.in.(${res.ids.join(",")})`,
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

  const { deletedIds } = await deleteWeighments(client, user.factory_id!, ids);

  if (deletedIds.length === 0) {
    return apiError("One or more weighments not found", StatusCodes.NOT_FOUND);
  }

  return NextResponse.json({ success: true, deleted_count: deletedIds.length });
});
